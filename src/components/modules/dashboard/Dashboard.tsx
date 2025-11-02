import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../ui/Card";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Users,
  Package,
  FileText,
} from "lucide-react";
import { db } from "../../../lib/db";
import { useApp } from "../../../context/AppContext";
import { Sale } from "../../../types";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

export const Dashboard: React.FC = () => {
  const { currentShop, setCurrentModule } = useApp();
  const { isLoaded: isUserLoaded } = useUser();
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);

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

    const handleSalesUpdated = (payload: any) => {
      if (!payload?.shopId || payload.shopId !== shopId) {
        return;
      }
      const items: Sale[] = payload?.items || db.sales.getByShopId(shopId);
      applySales(items);
    };

    const handleSaleCreated = (payload: any) => {
      if (!payload?.shopId || payload.shopId !== shopId) {
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
