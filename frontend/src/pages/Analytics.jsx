import React, { useEffect, useState } from 'react';
import { getStats } from '../services/api.js';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  CartesianGrid, XAxis, YAxis, LineChart, Line
} from 'recharts';

// Distinct, high-contrast colors for dark UI
const STATUS_COLORS = {
  Wishlist: '#60a5fa', // blue
  Applied:  '#34d399', // green
  OA:       '#fbbf24', // amber
  Phone:    '#a78bfa', // purple
  Onsite:   '#2dd4bf', // teal
  Offer:    '#f472b6', // pink
  Rejected: '#f87171', // red
  default:  '#9ca3af'  // gray (fallback)
};

const colorFor = (status) => STATUS_COLORS[status] || STATUS_COLORS.default;

export default function Analytics(){
  const [data, setData] = useState({ status: [], weekly: [] });

  useEffect(() => {
    (async () => {
      const raw = await getStats();
      // Ensure `count` is a number (not a string) so charts render correctly
      const status = raw.status.map(s => ({ ...s, count: Number(s.count) }));
      const weekly = raw.weekly.map(w => ({ ...w, count: Number(w.count) }));
      setData({ status, weekly });
    })();
  }, []);

  return (
    <div className="container">
      <div className="grid">
        {/* ---------- Pie: Status Distribution ---------- */}
        <div className="col-6 card">
          <h3 style={{marginTop:0}}>Status Distribution</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.status}
                  dataKey="count"
                  nameKey="status"
                  outerRadius="80%"
                  label={(d) => `${d.status}: ${d.count}`}
                  labelLine={false}
                >
                  {data.status.map((entry, i) => (
                    <Cell key={i} fill={colorFor(entry.status)} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ---------- Line: Applications per Week ---------- */}
        <div className="col-6 card">
          <h3 style={{marginTop:0}}>Applications per Week</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart
                data={data.weekly}
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tickMargin={8} />
                <YAxis allowDecimals={false} domain={[0, 'dataMax + 1']} />
                <Tooltip />
                {/* Legend for the line chart */}
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 8 }} />
                {/* single series; give it a name for the legend + a readable stroke */}
                <Line type="monotone" dataKey="count" name="Applications" stroke="#60a5fa" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
