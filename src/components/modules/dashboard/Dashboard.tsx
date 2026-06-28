import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../ui/Card";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Users,
  Package,
  FileText,
  Trophy,
  Medal,
} from "lucide-react";
import { db } from "../../../lib/db";
import { useApp } from "../../../context/AppContext";
import { Sale } from "../../../types";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { getJSON } from "../../../lib/api";

type SalesUpdatedPayload = {
  shopId?: string;
  items?: Sale[];
};

type SaleCreatedPayload = {
  shopId?: string;
  sale?: Sale;
};

const isSalesUpdatedPayload = (payload: unknown): payload is SalesUpdatedPayload => {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const candidate = payload as Record<string, unknown>;
  const items = candidate.items;
  const validItems =
    items === undefined ||
    (Array.isArray(items) && items.every((item) => typeof item === "object" && item !== null));
  const shopId = candidate.shopId;
  const validShopId = shopId === undefined || typeof shopId === "string";
  return validShopId && validItems;
};

const isSaleCreatedPayload = (payload: unknown): payload is SaleCreatedPayload => {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const candidate = payload as Record<string, unknown>;
  const shopId = candidate.shopId;
  const sale = candidate.sale;
  const validShopId = shopId === undefined || typeof shopId === "string";
  const validSale = sale === undefined || (typeof sale === "object" && sale !== null);
  return validShopId && validSale;
};

type MemberStatRow = {
  member_id?: string;
  display_name?: string;
  role?: string;
  total_sales?: number;
  transactions_count?: number;
  date?: string;
};

type TeamMemberRow = {
  member_id: string;
  display_name: string;
  email: string;
  role: string;
  status: string;
};

type MemberStatsResponse = {
  ok: boolean;
  stats: MemberStatRow[];
  employeeOfMonth: {
    member_id?: string;
    display_name?: string;
    total_sales?: number;
    transactions_count?: number;
  } | null;
};

export const Dashboard: React.FC = () => {
  const { currentShop, setCurrentModule, activeShopId, memberScope } = useApp();
  const { isLoaded: isUserLoaded, user } = useUser();
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [memberStats, setMemberStats] = useState<MemberStatRow[]>([]);
  const [employeeOfMonth, setEmployeeOfMonth] = useState<MemberStatsResponse["employeeOfMonth"]>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";

  // --- ADDED: Gatekeeper Logic ---
  // This effect checks if the user is loaded and if they have a shop.
  // If they don't have a shop, it redirects them to the wizard.
  useEffect(() => {
    // Wait for both Clerk (isUserLoaded) and your AppContext (currentShop)
    // to be resolved before making a decision.
    if (isUserLoaded) {
      // If the user is loaded but there is no currentShop selected,
      // they need to create one.
      if (!currentShop) {
        console.log(
          "User loaded, no shop found. Redirecting to /shop-wizard..."
        );
        navigate("/shop-wizard");
      }
    }
  }, [isUserLoaded, currentShop, navigate]);
  // --- END ADDED ---

  useEffect(() => {
    if (!currentShop) {
      setSales([]);
      return;
    }

    const shopId = currentShop.id;

    const applySales = (nextSales: Sale[]) => {
      setSales(nextSales.slice());
    };

    const bootstrap = () => {
      const nextSales = db.sales.getByShopId(shopId);
      applySales(nextSales);
    };

    const handleSalesUpdated = (payload: unknown) => {
      if (!isSalesUpdatedPayload(payload)) {
        return;
      }
      if (!payload.shopId || payload.shopId !== shopId) {
        return;
      }
      const items: Sale[] = payload.items || db.sales.getByShopId(shopId);
      applySales(items);
    };

    const handleSaleCreated = (payload: unknown) => {
      if (!isSaleCreatedPayload(payload)) {
        return;
      }
      if (!payload.shopId || payload.shopId !== shopId) {
        return;
      }
      bootstrap();
    };

    bootstrap();

    const unsubscribeUpdated = db.on("salesUpdated", handleSalesUpdated);
    const unsubscribeCreated = db.on("saleCreated", handleSaleCreated);

    return () => {
      if (typeof unsubscribeUpdated === "function") {
        unsubscribeUpdated();
      } else {
        db.off("salesUpdated", handleSalesUpdated);
      }

      if (typeof unsubscribeCreated === "function") {
        unsubscribeCreated();
      } else {
        db.off("saleCreated", handleSaleCreated);
      }
    };
  }, [currentShop]);

  const isCashierView = memberScope?.role === "cashier";
  const canFilterMembers = Boolean(memberScope?.role === "owner" || memberScope?.role === "manager");
  const showEmployeeWidgets = Boolean(memberScope?.memberId);
  const showLeaderboard = Boolean(memberScope?.modules?.analytics) && !isCashierView;

  useEffect(() => {
    if (!canFilterMembers || !activeShopId || !userEmail) {
      setTeamMembers([]);
      setSelectedMemberId("all");
      return;
    }

    void getJSON<{ ok: boolean; members: TeamMemberRow[] }>(
      `/api/team/members?shopId=${encodeURIComponent(activeShopId)}&userEmail=${encodeURIComponent(userEmail)}`,
    )
      .then((data) => {
        setTeamMembers(Array.isArray(data.members) ? data.members : []);
      })
      .catch(() => {
        setTeamMembers([]);
      });
  }, [activeShopId, userEmail, canFilterMembers]);

  useEffect(() => {
    if (!showEmployeeWidgets || !activeShopId || !userEmail) {
      setMemberStats([]);
      setEmployeeOfMonth(null);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date();
    monthStart.setDate(1);
    const fromDate = monthStart.toISOString().slice(0, 10);
    const memberQuery =
      isCashierView && memberScope?.memberId
        ? `&memberId=${encodeURIComponent(memberScope.memberId)}`
        : canFilterMembers && selectedMemberId !== "all"
          ? `&memberId=${encodeURIComponent(selectedMemberId)}`
          : "";

    void getJSON<MemberStatsResponse>(
      `/api/terminals/member-stats?shopId=${encodeURIComponent(activeShopId)}&userEmail=${encodeURIComponent(userEmail)}&fromDate=${fromDate}&toDate=${today}${memberQuery}`,
    )
      .then((data) => {
        setMemberStats(Array.isArray(data.stats) ? data.stats : []);
        setEmployeeOfMonth(data.employeeOfMonth || null);
      })
      .catch(() => {
        setMemberStats([]);
        setEmployeeOfMonth(null);
      });
  }, [showEmployeeWidgets, activeShopId, userEmail, isCashierView, memberScope?.memberId, canFilterMembers, selectedMemberId]);

  const myPerformance = useMemo(() => {
    if (!isCashierView) return null;
    return memberStats.reduce(
      (acc, row) => ({
        totalSales: acc.totalSales + Number(row.total_sales || 0),
        transactions: acc.transactions + Number(row.transactions_count || 0),
      }),
      { totalSales: 0, transactions: 0 },
    );
  }, [isCashierView, memberStats]);

  const stats = useMemo(() => {
    if (!sales.length) {
      return {
        totalSales: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        customerCount: 0,
      };
    }

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    const uniqueCustomers = new Set<string>();
    sales.forEach((sale) => {
      if (sale.customerInfo?.email) {
        uniqueCustomers.add(sale.customerInfo.email);
      }
    });

    return {
      totalSales,
      totalRevenue,
      averageOrderValue,
      customerCount: uniqueCustomers.size,
    };
  }, [sales]);

  const recentSales = useMemo(() => {
    return sales
      .slice()
      .sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 5);
  }, [sales]);

  const statCards = [
    {
      title: "Total Sales",
      value: stats.totalSales.toString(),
      icon: <ShoppingBag size={20} />,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Total Revenue",
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: <DollarSign size={20} />,
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Avg. Order Value",
      value: `$${stats.averageOrderValue.toFixed(2)}`,
      icon: <TrendingUp size={20} />,
      color: "bg-amber-50 text-amber-600",
    },
    {
      title: "Customers",
      value: stats.customerCount.toString(),
      icon: <Users size={20} />,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // --- ADDED: Loading/Redirect State ---
  // While redirecting or loading, show a clean loading screen
  // This also prevents the dashboard from flashing with "0" stats
  if (!isUserLoaded || !currentShop) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  // --- END ADDED ---

  // This content will only be rendered if the user is loaded AND has a shop
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Card key={index} className="border border-gray-100">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${card.color}`}>{card.icon}</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {card.title}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {card.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showEmployeeWidgets && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title={isCashierView ? "My Performance" : "Employee of the Month"} className="border border-gray-100">
            {isCashierView ? (
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
                  <Trophy size={22} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {memberScope?.displayName || "You"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    ${myPerformance?.totalSales.toFixed(2) || "0.00"} sales this month
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {myPerformance?.transactions || 0} transactions
                  </p>
                </div>
              </div>
            ) : employeeOfMonth?.display_name ? (
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
                  <Trophy size={22} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {employeeOfMonth.display_name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    ${Number(employeeOfMonth.total_sales || 0).toFixed(2)} sales
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {Number(employeeOfMonth.transactions_count || 0)} transactions this month
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No employee stats yet this month.</p>
            )}
          </Card>

          {!showLeaderboard ? null : (
            <Card title="Team Leaderboard" className="lg:col-span-2 border border-gray-100">
              {canFilterMembers && (
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <label className="text-sm font-medium text-gray-700" htmlFor="member-filter">
                    Filter reports by member
                  </label>
                  <select
                    id="member-filter"
                    value={selectedMemberId}
                    onChange={(event) => setSelectedMemberId(event.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  >
                    <option value="all">All members</option>
                    {teamMembers.map((member) => (
                      <option key={member.member_id} value={member.member_id}>
                        {member.display_name} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {memberStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {memberStats.slice(0, 5).map((row, index) => (
                        <tr key={row.member_id || row.display_name || index}>
                          <td className="px-3 py-3">
                            {index === 0 ? (
                              <Medal size={16} className="text-amber-500" />
                            ) : (
                              <span className="text-gray-500">#{index + 1}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 font-medium text-gray-900">{row.display_name || "Unknown"}</td>
                          <td className="px-3 py-3">${Number(row.total_sales || 0).toFixed(2)}</td>
                          <td className="px-3 py-3">{Number(row.transactions_count || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Leaderboard will appear after team members record sales.</p>
              )}
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card
          title="Recent Sales"
          className="lg:col-span-2 border border-gray-100"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentSales.length > 0 ? (
                  recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.customerInfo?.name || "Walk-in Customer"}
                      </td>
                      {/* --- THIS WAS THE LOCATION OF THE BAD CODE ---
                          It has been removed.
                      */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.items.length}{" "}
                        {sale.items.length === 1 ? "item" : "items"}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${sale.total.toFixed(2)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(sale.timestamp)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-sm text-center text-gray-500"
                    >
                      No recent sales
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions" className="border border-gray-100">
          <div className="space-y-4">
            <button
              className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              onClick={() => setCurrentModule("pos")}
            >
              <div className="flex items-center">
                <ShoppingBag className="text-gray-500 mr-3" size={18} />
                <span className="font-medium">New Sale</span>
              </div>
              <span className="text-[#ECFF76]">→</span>
            </button>

            <button
              className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              onClick={() => setCurrentModule("inventory")}
            >
              <div className="flex items-center">
                <Package className="text-gray-500 mr-3" size={18} />
                <span className="font-medium">Add Product</span>
              </div>
              <span className="text-[#ECFF76]">→</span>
            </button>

            <button
              className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              onClick={() => setCurrentModule("reports")}
            >
              <div className="flex items-center">
                <FileText className="text-gray-500 mr-3" size={18} />
                <span className="font-medium">Sales Report</span>
              </div>
              <span className="text-[#ECFF76]">→</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
