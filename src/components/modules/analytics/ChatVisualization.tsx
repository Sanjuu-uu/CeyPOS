import React from 'react';
import { Card } from './Card';

export type VisualizationData =
  | {
      type: 'kpi_card';
      title: string;
      value: string;
      subtitle?: string | null;
    }
  | {
      type: 'remote_chart';
      provider?: string;
      chartType?: string;
      title?: string;
      status?: 'ready' | 'requested' | 'failed' | string;
      assetUrl?: string | null;
      requestId?: string | null;
      expiresAt?: string | null;
      message?: string | null;
    }
  | {
      type: 'visualization_error';
      provider?: string;
      chartType?: string;
      title?: string;
      status?: string;
      message?: string;
    };

interface ChatVisualizationProps {
  visualization: VisualizationData;
}

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  const styles: Record<string, string> = {
    ready: 'bg-emerald-100 text-emerald-700',
    requested: 'bg-amber-100 text-amber-700',
    failed: 'bg-rose-100 text-rose-700',
  };
  const className = styles[normalized] ?? 'bg-slate-100 text-slate-700';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {normalized}
    </span>
  );
};

export const ChatVisualization: React.FC<ChatVisualizationProps> = ({ visualization }) => {
  if (visualization.type === 'kpi_card') {
    return (
      <Card
        title={visualization.title}
        subtitle={visualization.subtitle ?? undefined}
        className="border border-gray-200"
      >
        <div className="text-3xl font-semibold text-blue-600 tracking-tight">{visualization.value}</div>
      </Card>
    );
  }

  if (visualization.type === 'remote_chart') {
    const { assetUrl, title, status, chartType, provider, message, requestId, expiresAt } =
      visualization;

    return (
      <Card className="border border-gray-200">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {title || `${chartType ?? 'Chart'} preview`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {provider ? provider.toUpperCase() : 'Remote'} visualization
              {chartType ? ` • ${chartType}` : ''}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {assetUrl ? (
          <div className="relative overflow-hidden rounded-md border border-gray-100">
            <img
              src={assetUrl}
              alt={title ?? chartType ?? 'Analytics visualization'}
              className="w-full h-auto"
            />
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            The chart is being prepared. You may refresh in a few moments to view the hosted asset.
          </p>
        )}

        {(message || requestId || expiresAt) && (
          <div className="mt-3 space-y-1.5">
            {message && <p className="text-xs text-gray-500">{message}</p>}
            {requestId && (
              <p className="text-[11px] text-gray-400 tracking-wide">Request id: {requestId}</p>
            )}
            {expiresAt && (
              <p className="text-[11px] text-gray-400 tracking-wide">
                Expires: {new Date(expiresAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </Card>
    );
  }

  if (visualization.type === 'visualization_error') {
    return (
      <Card
        className="bg-rose-50 border border-rose-100"
        title={visualization.title || `${visualization.chartType ?? 'Chart'} error`}
        subtitle={
          visualization.provider
            ? `Provider: ${visualization.provider.toUpperCase()}`
            : undefined
        }
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-rose-600 leading-relaxed">
            {visualization.message || 'The remote visualization service reported an error.'}
          </p>
          <StatusBadge status={visualization.status ?? 'failed'} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-50 border border-slate-100">
      <h4 className="text-sm font-semibold text-slate-700 mb-1">Unsupported visualization</h4>
      <p className="text-xs text-slate-500">
        The analytics assistant returned a visualization type that is not yet supported by the
        dashboard.
      </p>
    </Card>
  );
};