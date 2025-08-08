import React, { useState, useEffect } from 'react';
import { 
  CircularProgressbar, 
  CircularProgressbarWithChildren,
  buildStyles 
} from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Award,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { analyticsAPI } from '../../services/api';

const ComplianceScoreCard = () => {
  const [complianceData, setComplianceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getComplianceScore();
      setComplianceData(response.data.complianceScore);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch compliance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchComplianceData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!complianceData) return null;

  const { current, metrics, history, benchmark, recommendations, trends } = complianceData;

  const getScoreColor = (score) => {
    if (score >= 90) return '#10B981'; // green
    if (score >= 70) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return 'text-green-600 bg-green-100';
    if (grade.startsWith('B')) return 'text-blue-600 bg-blue-100';
    if (grade.startsWith('C')) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <div className="w-4 h-4"></div>;
  };

  return (
    <div className="space-y-6">
      {/* Main Score Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Business Compliance Score</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(current.grade)}`}>
            Grade {current.grade}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Circular Progress */}
          <div className="flex items-center justify-center">
            <div className="w-48 h-48">
              <CircularProgressbarWithChildren
                value={current.overall}
                styles={buildStyles({
                  pathColor: getScoreColor(current.overall),
                  trailColor: '#E5E7EB',
                  textColor: '#1F2937',
                })}
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{current.overall}%</div>
                  <div className="text-sm text-gray-600">Compliance Score</div>
                  {trends.monthlyTrend && (
                    <div className="flex items-center justify-center mt-2">
                      {getTrendIcon(trends.monthlyTrend)}
                      <span className="text-xs text-gray-500 ml-1">
                        {Math.abs(trends.monthlyTrend)}% this month
                      </span>
                    </div>
                  )}
                </div>
              </CircularProgressbarWithChildren>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Score Breakdown</h4>
            {Object.entries(current.breakdown).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {value.score}% ({value.weight}% weight)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${value.score}%`,
                      backgroundColor: getScoreColor(value.score)
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Benchmark */}
        {benchmark && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">Industry Benchmark</h5>
                <p className="text-sm text-gray-600">
                  Your score vs industry average ({benchmark.industryType})
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {current.overall}% vs {benchmark.average}%
                </div>
                <div className={`text-sm ${
                  current.overall >= benchmark.average ? 'text-green-600' : 'text-red-600'
                }`}>
                  {current.overall >= benchmark.average ? 'Above' : 'Below'} average
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Improvement Recommendations</h3>
          <Target className="w-5 h-5 text-blue-600" />
        </div>

        <div className="space-y-4">
          {recommendations.slice(0, 3).map((rec, index) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${
              rec.priority === 'high' ? 'border-red-500 bg-red-50' :
              rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-500 bg-blue-50'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  <p className="text-sm text-gray-700 mt-2">
                    <strong>Action:</strong> {rec.actionRequired}
                  </p>
                  {rec.deadline && (
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      Deadline: {new Date(rec.deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="ml-4 text-right">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {rec.priority.toUpperCase()}
                  </div>
                  {rec.potentialImpact && (
                    <div className="text-xs text-green-600 mt-1">
                      +{rec.potentialImpact} points
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {recommendations.length > 3 && (
            <div className="text-center">
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center mx-auto">
                View all {recommendations.length} recommendations
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Score History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Score History</h3>
        
        {history && history.length > 0 ? (
          <div className="space-y-3">
            {history.slice(-5).map((record, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{record.score}%</div>
                  <div className="text-sm text-gray-600">
                    {new Date(record.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  {record.factors && record.factors.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Key factors: {record.factors.slice(0, 2).map(f => f.factor).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No score history available yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Your compliance score will be tracked over time
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-blue-600 font-medium">Complete Pending Actions</span>
          </button>
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
            <Target className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-600 font-medium">Set Compliance Goals</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplianceScoreCard;
