"use client";
import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  type UTCTimestamp,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import type { Candle } from "@/lib/providers/market";
export default function PriceChart({
  candles,
  dark = false,
}: {
  candles: Candle[];
  dark?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null),
    chartRef = useRef<IChartApi | null>(null),
    seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null),
    rangeKey = useRef("");
  useEffect(() => {
    if (!el.current) return;
    const chart = createChart(el.current, {
      height: 285,
      layout: {
        background: {
          type: ColorType.Solid,
          color: dark ? "#17231d" : "#ffffff",
        },
        textColor: "#8b948f",
        fontFamily: "Arial",
        fontSize: 10,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: dark ? "#253329" : "#f1f3f1" },
        horzLines: { color: dark ? "#253329" : "#f1f3f1" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.15, bottom: 0.13 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: "#718373", labelBackgroundColor: "#234b35" },
        horzLine: { color: "#718373", labelBackgroundColor: "#234b35" },
      },
      handleScale: true,
      handleScroll: true,
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#298b65",
      downColor: "#d47b77",
      borderUpColor: "#298b65",
      borderDownColor: "#d47b77",
      wickUpColor: "#298b65",
      wickDownColor: "#d47b77",
    });
    chartRef.current = chart;
    seriesRef.current = series;
    rangeKey.current = "";
    const observer = new ResizeObserver(([entry]) =>
      chart.applyOptions({ width: entry.contentRect.width }),
    );
    observer.observe(el.current);
    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [dark]);
  useEffect(() => {
    if (!candles.length || !seriesRef.current) return;
    const precision = candles[0].close > 10 ? 3 : 5;
    seriesRef.current.applyOptions({
      priceFormat: {
        type: "price",
        precision,
        minMove: precision === 3 ? 0.001 : 0.00001,
      },
    });
    seriesRef.current.setData(
      candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })),
    );
    const key = `${candles[0].time}:${precision}`;
    if (key !== rangeKey.current) {
      chartRef.current?.timeScale().fitContent();
      rangeKey.current = key;
    }
  }, [candles, dark]);
  return (
    <div
      ref={el}
      className="price-chart"
      aria-label="Interactive practice candlestick chart"
    />
  );
}
