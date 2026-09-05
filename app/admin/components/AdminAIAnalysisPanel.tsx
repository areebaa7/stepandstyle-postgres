'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { TrendingUp, AlertTriangle, PackageX, Layers, RefreshCw, ArrowUpRight, Zap, CheckCircle2 } from 'lucide-react';
import { AdminNotice } from './AdminAsyncState';

export default function AdminAIAnalysisPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'bestsellers' | 'inventory' | 'collections' | 'slow'>('bestsellers');

  const fetchAIAnalysis = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/ai-analysis', { cache: 'no-store' });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to load AI product analysis.');
      }
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error loading analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIAnalysis();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
        </div>
        <p className="text-gray-600 font-medium text-sm">Analyzing Product Sales & Inventory Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <AdminNotice
        type="error"
        message={error}
        action={
          <button
            onClick={fetchAIAnalysis}
            className="px-3 py-1 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        }
      />
    );
  }

  const { summary, bestSellersByUnits, bestSellersByRevenue, lowStockProducts, outOfStockProducts, slowMovingProducts, collectionBreakdown, aiRecommendations } = data;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold uppercase tracking-wider">
              AI Inventory & Product Intelligence
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">AI Product Analysis & Insights</h2>
            <p className="text-purple-200/80 text-sm max-w-xl">
              Real-time automated evaluation of best-selling products, inventory stock health, sales velocity, and AI recommendation engines.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-4 rounded-xl border border-white/10 self-start md:self-auto">
            <div className="text-right">
              <div className="text-xs font-semibold text-purple-200 uppercase tracking-wider">Inventory Health Score</div>
              <div className="text-3xl font-black text-emerald-400">{summary.healthScore}%</div>
            </div>
            <button
              onClick={fetchAIAnalysis}
              className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
              title="Refresh AI Analysis"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Catalog</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <span className="text-3xl font-black text-gray-900">{summary.totalProducts}</span>
            <span className="text-xs text-gray-500 ml-2">Active Items</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <span className="text-3xl font-black text-emerald-600">Rs {summary.totalRevenue.toLocaleString()}</span>
            <span className="text-xs text-gray-500 ml-2">({summary.totalUnitsSold} units)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Low Stock Items</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <span className="text-3xl font-black text-amber-600">{summary.lowStockCount}</span>
            <span className="text-xs text-gray-500 ml-2">Need Restock</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Out of Stock</span>
            <PackageX className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <span className="text-3xl font-black text-rose-600">{summary.outOfStockCount}</span>
            <span className="text-xs text-gray-500 ml-2">Items</span>
          </div>
        </div>
      </div>

      {/* AI Recommendations Section */}
      {aiRecommendations && aiRecommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-black text-gray-900 tracking-tight">AI Smart Recommendations</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiRecommendations.map((rec: any) => (
              <div
                key={rec.id}
                className={`p-5 rounded-xl border transition-all ${
                  rec.type === 'URGENT'
                    ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                    : rec.type === 'OPPORTUNITY'
                    ? 'bg-purple-50/50 border-purple-200 text-purple-950'
                    : 'bg-amber-50/50 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {rec.type === 'URGENT' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : rec.type === 'OPPORTUNITY' ? (
                      <Zap className="w-4 h-4 text-purple-600 shrink-0" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span className="font-bold text-sm">{rec.title}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/80 border border-current/20">
                    {rec.type}
                  </span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed mb-3">{rec.description}</p>
                <div className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer">
                  <span>{rec.action}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Analysis Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/50 px-4 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('bestsellers')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all ${
              activeSubTab === 'bestsellers'
                ? 'bg-white text-purple-700 border-t-2 border-purple-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            🔥 Best-Selling Products
          </button>
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all ${
              activeSubTab === 'inventory'
                ? 'bg-white text-purple-700 border-t-2 border-purple-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            ⚠️ Stock & Health Alerts
          </button>
          <button
            onClick={() => setActiveSubTab('collections')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all ${
              activeSubTab === 'collections'
                ? 'bg-white text-purple-700 border-t-2 border-purple-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📊 Collection Analysis
          </button>
          <button
            onClick={() => setActiveSubTab('slow')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all ${
              activeSubTab === 'slow'
                ? 'bg-white text-purple-700 border-t-2 border-purple-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            💤 Slow-Moving Items
          </button>
        </div>

        <div className="p-6">
          {/* Sub-Tab 1: Best Sellers */}
          {activeSubTab === 'bestsellers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-base">Top Performing Best-Sellers</h4>
                  <p className="text-xs text-gray-500">Products sorted by sales volume and revenue generation</p>
                </div>
              </div>

              {bestSellersByUnits.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No sales data recorded yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bestSellersByUnits.map((prod: any, idx: number) => (
                    <div key={prod.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-gray-50 transition-all">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-black text-sm flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {prod.image ? (
                          <Image src={prod.image} alt={prod.name} fill className="object-cover"  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No image</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 text-sm truncate">{prod.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>Collection: {prod.collectionName}</span>
                          <span>•</span>
                          <span className="font-semibold text-gray-700">Rs {prod.price.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="font-bold text-purple-700">{prod.unitsSold} Units Sold</span>
                          <span className="font-bold text-emerald-600">Rs {prod.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 2: Stock Alerts */}
          {activeSubTab === 'inventory' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-gray-900 text-base">Inventory Stock Health Alerts</h4>
                <p className="text-xs text-gray-500">Products requiring immediate restock or variant replenishment</p>
              </div>

              {outOfStockProducts.length === 0 && lowStockProducts.length === 0 ? (
                <div className="py-8 text-center text-emerald-600 text-sm font-semibold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  All products have healthy stock levels!
                </div>
              ) : (
                <div className="space-y-4">
                  {outOfStockProducts.map((prod: any) => (
                    <div key={prod.id} className="flex items-center justify-between p-4 rounded-xl border border-rose-200 bg-rose-50/40">
                      <div className="flex items-center gap-3">
                        <PackageX className="w-5 h-5 text-rose-600 shrink-0" />
                        <div>
                          <div className="font-bold text-rose-950 text-sm">{prod.name}</div>
                          <div className="text-xs text-rose-700">Out of Stock • Collection: {prod.collectionName}</div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white">Out of Stock</span>
                    </div>
                  ))}

                  {lowStockProducts.map((prod: any) => (
                    <div key={prod.id} className="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50/40">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <div className="font-bold text-amber-950 text-sm">{prod.name}</div>
                          <div className="text-xs text-amber-700">
                            {prod.lowStockVariants.length > 0
                              ? `Low variants: ${prod.lowStockVariants.join(', ')}`
                              : `Total stock remaining: ${prod.totalStock}`}
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">Low Stock</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 3: Collections */}
          {activeSubTab === 'collections' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-gray-900 text-base">Category & Collection Performance</h4>
                <p className="text-xs text-gray-500">Revenue and sales distribution across catalog categories</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {collectionBreakdown.map((col: any) => (
                  <div key={col.collectionName} className="p-5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-purple-700">{col.collectionName}</div>
                    <div className="text-2xl font-black text-gray-900">Rs {col.revenue.toLocaleString()}</div>
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200/60">
                      <span>{col.productCount} Products</span>
                      <span className="font-semibold">{col.unitsSold} Units Sold</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Tab 4: Slow Moving */}
          {activeSubTab === 'slow' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-gray-900 text-base">Slow-Moving & Dead Stock Candidates</h4>
                <p className="text-xs text-gray-500">Products with low sales velocity suitable for promotional discounts or sales</p>
              </div>

              {slowMovingProducts.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No slow-moving products identified.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slowMovingProducts.map((prod: any) => (
                    <div key={prod.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 text-sm truncate">{prod.name}</span>
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {prod.unitsSold} Sales
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">Price: Rs {prod.price.toLocaleString()} • Collection: {prod.collectionName}</div>
                      <p className="text-xs text-purple-700 pt-1 font-medium">💡 Recommendation: Include in Seasonal Sale with 15-20% discount.</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
