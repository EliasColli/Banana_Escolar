import type { ResolutionByCategory, TopLocation, WeeklyReportPoint } from '@banana/api-client';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { formatWeek } from '@/shared/lib/labels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

const gridColor = 'rgba(148, 163, 184, 0.18)';
const tickColor = '#64748b';

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f172a',
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: tickColor, font: { size: 11 } },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      grid: { color: gridColor },
      ticks: { color: tickColor, font: { size: 11 }, precision: 0 },
      border: { display: false },
    },
  },
} as const;

export function WeeklyReportsChart({ data }: { data: WeeklyReportPoint[] }) {
  return (
    <div className="h-72">
      <Line
        data={{
          labels: data.map((point) => formatWeek(point.weekStart)),
          datasets: [
            {
              label: 'Reportes',
              data: data.map((point) => point.count),
              borderColor: '#de911d',
              backgroundColor: 'rgba(247, 201, 72, 0.22)',
              fill: true,
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: '#de911d',
              borderWidth: 2.5,
            },
          ],
        }}
        options={{
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            tooltip: {
              ...baseOptions.plugins.tooltip,
              callbacks: {
                label: (context) => `${context.parsed.y} reportes`,
              },
            },
          },
        }}
      />
    </div>
  );
}

export function ResolutionByCategoryChart({ data }: { data: ResolutionByCategory[] }) {
  return (
    <div className="h-72">
      <Bar
        data={{
          labels: data.map((row) => row.categoria),
          datasets: [
            {
              label: 'Días promedio',
              data: data.map((row) => row.avgDays ?? 0),
              backgroundColor: 'rgba(47, 158, 68, 0.75)',
              hoverBackgroundColor: 'rgba(47, 158, 68, 0.95)',
              borderRadius: 6,
              barThickness: 18,
            },
          ],
        }}
        options={{
          ...baseOptions,
          indexAxis: 'y' as const,
          plugins: {
            ...baseOptions.plugins,
            tooltip: {
              ...baseOptions.plugins.tooltip,
              callbacks: {
                label: (context) => `${Number(context.parsed.x).toFixed(2)} días promedio`,
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: gridColor },
              ticks: { color: tickColor, font: { size: 11 } },
              border: { display: false },
            },
            y: {
              grid: { display: false },
              ticks: { color: tickColor, font: { size: 11 } },
              border: { display: false },
            },
          },
        }}
      />
    </div>
  );
}

export function TopLocationsChart({ data }: { data: TopLocation[] }) {
  return (
    <div className="h-72">
      <Bar
        data={{
          labels: data.map((row) => row.ubicacion),
          datasets: [
            {
              label: 'Reportes',
              data: data.map((row) => row.count),
              backgroundColor: 'rgba(222, 145, 29, 0.8)',
              hoverBackgroundColor: 'rgba(222, 145, 29, 1)',
              borderRadius: 6,
              maxBarThickness: 42,
            },
          ],
        }}
        options={{
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            tooltip: {
              ...baseOptions.plugins.tooltip,
              callbacks: {
                label: (context) => `${context.parsed.y} reportes`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: tickColor,
                font: { size: 10 },
                maxRotation: 35,
                minRotation: 0,
                autoSkip: false,
              },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              grid: { color: gridColor },
              ticks: { color: tickColor, font: { size: 11 }, precision: 0 },
              border: { display: false },
            },
          },
        }}
      />
    </div>
  );
}
