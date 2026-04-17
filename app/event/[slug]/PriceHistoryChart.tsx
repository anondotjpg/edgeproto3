"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

type HistoryPoint = {
  t: number;
  p: number;
};

type PriceHistoryResponse = {
  updatedAt: string;
  away: {
    label: string;
    tokenId?: string;
    history: HistoryPoint[];
  };
  home: {
    label: string;
    tokenId?: string;
    history: HistoryPoint[];
  };
  error?: string;
};

type Props = {
  slug: string;
};

function formatTimeLabel(timestampSeconds: number) {
  return new Date(timestampSeconds * 1000).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PriceHistoryChart({ slug }: Props) {
  const [data, setData] = useState<PriceHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let revealTimer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      setIsLoading(true);
      setShowChart(false);

      try {
        const res = await fetch(
          `/api/event/${encodeURIComponent(slug)}/price-history`,
          {
            cache: "no-store",
          }
        );

        const json = (await res.json()) as PriceHistoryResponse;

        if (!cancelled) {
          setData(json);
        }
      } catch {
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          revealTimer = setTimeout(() => {
            if (!cancelled) {
              setIsLoading(false);
              setShowChart(true);
            }
          }, 250);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, [slug]);

  const chartData = useMemo(() => {
    if (!data) return [];

    const awayMap = new Map<number, number>(
      data.away.history.map((point) => [point.t, point.p])
    );
    const homeMap = new Map<number, number>(
      data.home.history.map((point) => [point.t, point.p])
    );

    const timestamps = Array.from(
      new Set([...awayMap.keys(), ...homeMap.keys()])
    ).sort((a, b) => a - b);

    return timestamps.map((t) => ({
      t,
      away: awayMap.get(t),
      home: homeMap.get(t),
    }));
  }, [data]);

  if (!isLoading && (!data || data.error || chartData.length === 0)) {
    return (
      <div className="mt-8 min-w-0 rounded-[28px] bg-zinc-950 p-6">
        <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          History
        </div>
        <div className="mt-3 text-[13px] text-zinc-400">
          No price history available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 min-w-0 rounded-[28px] bg-zinc-950 p-6">
      <div className="mb-4">
        <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          History
        </div>
      </div>

      <div className="relative w-full min-w-0 overflow-hidden rounded-2xl">
        {showChart ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="w-full min-w-0"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.currentTarget.blur();
            }}
          >
            <div className="w-full min-w-0 overflow-hidden rounded-2xl outline-none focus:outline-none [&_*:focus]:outline-none">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 0, left: 0, bottom: 12 }}
                >
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(value) => formatTimeLabel(Number(value))}
                    minTickGap={32}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    tickMargin={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tickFormatter={(value) =>
                      `${Math.round(Number(value) * 100)}%`
                    }
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Legend />
                  <Line
                    type="linear"
                    dataKey="away"
                    name={data?.away.label}
                    stroke="#ffffff"
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                    connectNulls
                  />
                  <Line
                    type="linear"
                    dataKey="home"
                    name={data?.home.label}
                    stroke="#71717a"
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        ) : (
          <div className="h-[280px] w-full" />
        )}
      </div>
    </div>
  );
}