import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText,
  DollarSign,
  Target,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';
import ErrorMessage from '../Common/ErrorMessage';

const AnalyticsDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getDashboard();
      setDashboardData(response.data.dashboard);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await analyticsAPI.updateAnalytics();
      await fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const downloadReport = async (reportType = 'comprehensive', format = 'pdf') => {
    try {
      const response = await analyticsAPI.generateReport(reportType, 'monthly', format);
      
      if (format === 'pdf') {
        // Handle PDF download
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-report-${Date.now()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Handle JSON download
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-report-${Date.now()}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download report');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchDashboardData} />;
  if (!dashboardData) return <div>No data available</div>;

  const {
    complianceScore,
    gstFilingStats,
    taxLiability,
    itcAnalytics,
    eWayBillStats,
    platformUsage,
    alerts,
    recentActivity,
    upcomingDeadlines,
    quickStats
  } = dashboardData;

  const getComplianceColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceGradient = (score) => {
    if (score >= 90) return 'from-green-500 to-green-600';
    if (score >= 70) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">Comprehensive view of your GST compliance and business metrics</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => downloadReport()}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Score</p>
                <p className={`text-2xl font-bold ${getComplianceColor(complianceScore.overall)}`}>
                  {complianceScore.overall}%
                </p>
                <p className="text-sm text-gray-500">Grade: {complianceScore.grade}</p>
              </div>
              <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getComplianceGradient(complianceScore.overall)} flex items-center justify-center`}>
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">GST Returns</p>
                <p className="text-2xl font-bold text-gray-900">{quickStats.totalGSTReturns}</p>
                <p className="text-sm text-gray-500">
                  {gstFilingStats.filedOnTime} filed on time
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tax Liability</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{(taxLiability.currentMonth.total || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Current month</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">E-Way Bills</p>
                <p className="text-2xl font-bold text-gray-900">{quickStats.totalEWayBills}</p>
                <p className="text-sm text-gray-500">
                  {eWayBillStats.activeEWayBills} active
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Compliance Score Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Score Breakdown</h3>
              <div className="space-y-4">
                {Object.entries(complianceScore.breakdown).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full bg-gradient-to-r ${getComplianceGradient(value.score)}`}
                          style={{ width: `${value.score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-12">
                        {value.score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GST Filing Performance */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">GST Filing Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{gstFilingStats.totalReturns}</p>
                  <p className="text-sm text-gray-600">Total Returns</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{gstFilingStats.filedOnTime}</p>
                  <p className="text-sm text-gray-600">On Time</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{gstFilingStats.lateFilings}</p>
                  <p className="text-sm text-gray-600">Late Filings</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{gstFilingStats.pendingReturns}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
              
              {/* Return Types Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(gstFilingStats.returnTypes).map(([type, data]) => (
                  <div key={type} className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 uppercase mb-2">{type}</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Filed: {data.filed}</span>
                      <span className="text-yellow-600">Pending: {data.pending}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax Liability Trend */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Liability Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={taxLiability.monthlyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Tax Liability']} />
                  <Area type="monotone" dataKey="total" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Alerts */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
              <div className="space-y-3">
                {alerts.length > 0 ? (
                  alerts.slice(0, 5).map((alert, index) => (
                    <div key={index} className={`p-3 rounded-lg border-l-4 ${
                      alert.severity === 'high' ? 'border-red-500 bg-red-50' :
                      alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}>
                      <div className="flex items-start">
                        <AlertTriangle className={`w-4 h-4 mt-0.5 mr-2 ${
                          alert.severity === 'high' ? 'text-red-500' :
                          alert.severity === 'medium' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No active alerts</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h3>
              <div className="space-y-3">
                {upcomingDeadlines.length > 0 ? (
                  upcomingDeadlines.slice(0, 5).map((deadline, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{deadline.title}</p>
                        <p className="text-xs text-gray-600">{deadline.description}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-medium ${
                          deadline.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {new Date(deadline.dueDate).toLocaleDateString()}
                        </p>
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          deadline.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No upcoming deadlines</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'filed' || activity.status === 'generated' ? 'bg-green-500' :
                        activity.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600">No recent activity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
              <div className="space-y-3">
                {complianceScore.recommendations.length > 0 ? (
                  complianceScore.recommendations.map((rec, index) => (
                    <div key={index} className={`p-3 rounded-lg border-l-4 ${
                      rec.priority === 'high' ? 'border-red-500 bg-red-50' :
                      rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}>
                      <p className="text-sm font-medium text-gray-900">{rec.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                      {rec.potentialImpact && (
                        <p className="text-xs text-green-600 mt-1">
                          Potential impact: +{rec.potentialImpact} points
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">All recommendations completed</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
