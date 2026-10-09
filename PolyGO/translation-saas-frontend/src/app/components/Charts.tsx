'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface UsageData {
  transcriptionMinutes: number;
  translationCount: number;
  storageUsed: number;
  transcriptionLimit: number;
  translationLimit: number;
  storageLimit: number;
}

interface ActivityData {
  date: string;
  transcriptions: number;
  translations: number;
}

interface ChartsProps {
  usageData: UsageData;
  activityData: ActivityData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

export default function Charts({ usageData, activityData }: ChartsProps) {
  const usageChartData = [
    {
      name: 'Transcription',
      used: usageData.transcriptionMinutes,
      limit: usageData.transcriptionLimit
    },
    {
      name: 'Translations',
      used: usageData.translationCount,
      limit: usageData.translationLimit
    },
    {
      name: 'Storage (GB)',
      used: usageData.storageUsed,
      limit: usageData.storageLimit
    }
  ];

  const lineChartData = {
    labels: activityData.map(d => d.date),
    datasets: [
      {
        label: 'Transcriptions',
        data: activityData.map(d => d.transcriptions),
        borderColor: '#8884d8',
        backgroundColor: '#8884d8',
        tension: 0.4
      },
      {
        label: 'Translations',
        data: activityData.map(d => d.translations),
        borderColor: '#82ca9d',
        backgroundColor: '#82ca9d',
        tension: 0.4
      }
    ]
  };

  const pieChartData = {
    labels: usageChartData.map(d => d.name),
    datasets: [
      {
        data: usageChartData.map(d => d.used),
        backgroundColor: COLORS,
        borderColor: COLORS,
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const
      }
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Usage Analytics</h2>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {usageChartData.map((item, index) => (
          <div key={item.name} className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">{item.name}</h3>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                    {Math.round((item.used / item.limit) * 100)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-blue-600">
                    {item.used} / {item.limit}
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                <div
                  style={{ width: `${(item.used / item.limit) * 100}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Timeline */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
        <div className="h-80">
          <Line data={lineChartData} options={chartOptions} />
        </div>
      </div>

      {/* Usage Distribution */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Usage Distribution</h3>
        <div className="h-80">
          <Pie data={pieChartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
} 