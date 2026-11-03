import React, { useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

export default function ChartsOverview({ tasks, isLight }) {
  const [chartMonth, setChartMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const high = tasks.filter(t => t.priority === 'high').length;
  const medium = tasks.filter(t => t.priority === 'medium').length;
  const low = tasks.filter(t => t.priority === 'low').length;

  const doughnutColors = isLight
    ? ['#ff3b30', '#ff9500', '#0071e3']
    : ['#ff453a', '#ffd60a', '#0a84ff'];

  const priorityData = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [
      {
        data: [high, medium, low],
        backgroundColor: doughnutColors,
        borderWidth: 0
      }
    ]
  };

  const priorityOptions = {
    responsive: true,
    maintainAspectRatio: true
  };

  // Weekly Completion Calculations
  const year = chartMonth.getFullYear();
  const month = chartMonth.getMonth();
  const monthName = chartMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  });

  const now = new Date();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  const weeks = [0, 0, 0, 0, 0];
  tasks.forEach(task => {
    if (!task.completed || !task.completedAt) return;
    const completedDate = new Date(task.completedAt);
    if (
      completedDate.getFullYear() === year &&
      completedDate.getMonth() === month
    ) {
      const weekIndex = Math.floor((completedDate.getDate() - 1) / 7);
      if (weekIndex < 5) weeks[weekIndex]++;
    }
  });

  const monthTotal = weeks.reduce((sum, count) => sum + count, 0);
  const bestCount = Math.max(...weeks);
  const bestWeek = weeks.indexOf(bestCount) + 1;
  const hasTasks = tasks.length > 0;

  const barColor = isLight ? '#0071e3' : '#0a84ff';

  const weeklyData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
    datasets: [
      {
        label: `Tasks completed - ${monthName}`,
        data: weeks,
        backgroundColor: barColor,
        borderRadius: 4
      }
    ]
  };

  const weeklyOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    }
  };

  const handlePrevMonth = () => {
    setChartMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (isCurrentMonth) return;
    setChartMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <section id="charts">
      <h2>Task overview</h2>

      <div className="chart-card">
        <h3>Tasks by priority</h3>
        {hasTasks ? (
          <>
            <Doughnut id="priority-chart" data={priorityData} options={priorityOptions} />
            <div id="priority-legend"></div>
          </>
        ) : (
          <p className="chart-empty">Add tasks to see your chart.</p>
        )}
      </div>

      <div className="chart-card">
        <div className="weekly-chart-heading">
          <h3 id="weekly-chart-title">
            {isCurrentMonth ? 'Tasks completed this month' : `Tasks completed in ${monthName}`}
          </h3>
          <div className="month-controls" aria-label="Choose chart month">
            <button
              id="previous-month"
              type="button"
              aria-label="Show previous month"
              onClick={handlePrevMonth}
            >
              &#9664;
            </button>
            <button
              id="next-month"
              type="button"
              aria-label="Show next month"
              onClick={handleNextMonth}
              disabled={isCurrentMonth}
            >
              &#9654;
            </button>
          </div>
        </div>
        {!hasTasks ? (
          <p className="chart-empty">Add tasks to see your chart.</p>
        ) : monthTotal === 0 ? (
          <p className="chart-empty">No tasks completed in {monthName}.</p>
        ) : (
          <>
            <p id="weekly-summary" className="chart-summary">
              {monthTotal} {monthTotal === 1 ? 'task' : 'tasks'} completed. Best week: Week {bestWeek} ({bestCount}).
            </p>
            <Bar id="weekly-chart" data={weeklyData} options={weeklyOptions} />
          </>
        )}
      </div>
    </section>
  );
}
