'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface Project {
  id: string;
  cluster_id: string;
  cluster_key: string;
  cluster_name: string;
  cluster_online: boolean;
  project_id: string;
  project_key: string;
  project_name: string;
  source_type: string;
  groups: string[];
  tags: string[];
  measurement_count: number;
  quality_score_avg: number;
  storage_bytes: number;
  updated_at: string;
  last_synced_at: string;
}

interface Stats {
  total_projects: number;
  total_measurements: number;
  total_storage_bytes: number;
  avg_quality_score: number | null;
}

function TestDataPageContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCluster, setSelectedCluster] = useState<string>('');

  useEffect(() => {
    fetchProjects();
  }, [search, selectedCluster]);

  async function fetchProjects() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCluster) params.append('cluster_id', selectedCluster);

      const response = await fetch(`/api/test-data/projects?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      setProjects(data.projects || []);
      setStats(data.stats || null);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleViewProject(project: Project) {
    if (!project.cluster_online) {
      alert(`Cluster ${project.cluster_key} is offline. Cannot fetch full data.`);
      return;
    }

    // Navigate to project detail page
    router.push(`/test-data/project/${project.cluster_id}/${project.project_key}`);
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test Data</h1>
          <p className="text-gray-500 mt-1">
            View test data projects from all your Centcom clusters
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Projects</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {stats.total_projects.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Measurements</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {stats.total_measurements.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Storage</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {formatBytes(stats.total_storage_bytes)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Avg Quality</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {stats.avg_quality_score ? stats.avg_quality_score.toFixed(1) : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search projects by name or key..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={fetchProjects}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-800 font-medium">Error loading projects</div>
          </div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
          <button
            onClick={fetchProjects}
            className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <div className="text-gray-600 mt-4">Loading projects...</div>
        </div>
      ) : (
        /* Project Table */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cluster
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Measurements
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Synced
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="text-lg font-medium mb-2">No projects found</div>
                    <div className="text-sm">
                      {search ? 'Try adjusting your search filters' : 'Connect a Centcom cluster to see test data projects'}
                    </div>
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span
                          className={`w-3 h-3 rounded-full mr-2 ${
                            project.cluster_online ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          title={project.cluster_online ? 'Online' : 'Offline'}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {project.cluster_key}
                          </div>
                          <div className="text-xs text-gray-500">{project.cluster_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-medium text-gray-900">
                        {project.project_key}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{project.project_name}</div>
                      {project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {project.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                          {project.tags.length > 3 && (
                            <span className="text-xs text-gray-500">+{project.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{project.source_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {project.measurement_count.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {project.quality_score_avg ? (
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">
                            {project.quality_score_avg.toFixed(1)}
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                project.quality_score_avg >= 90
                                  ? 'bg-green-500'
                                  : project.quality_score_avg >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${project.quality_score_avg}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDate(project.last_synced_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewProject(project)}
                        disabled={!project.cluster_online}
                        className={`font-medium ${
                          project.cluster_online
                            ? 'text-blue-600 hover:text-blue-900 cursor-pointer'
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                        title={project.cluster_online ? 'View project' : 'Cluster offline'}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Box */}
      {projects.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Real-Time Data Access</h3>
              <div className="mt-1 text-sm text-blue-700">
                This page shows lightweight metadata synced from your clusters. Click "View" on any
                project to fetch full measurement data in real-time from the cluster.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestDataPage() {
  return (
    <DashboardLayout>
      <TestDataPageContent />
    </DashboardLayout>
  );
}
