'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface Category {
  id: string;
  signalPath: string;
  measurementName: string;
  resultName: string;
  categoryString: string;
  data: any;
  details: any;
}

interface ProjectData {
  key: string;
  name: string;
  groups: string[];
  dataTypes: string[];
  categories: Category[];
  testConfigurations: Record<string, string>;
  summaryData: {
    overall_result: string;
    statistics: Record<string, number>;
  };
  details: any;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  sourceType: string;
  originalResultsCount: number;
}

function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { clusterId, projectKey } = params as { clusterId: string; projectKey: string };

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    fetchProjectData();
  }, [clusterId, projectKey]);

  async function fetchProjectData() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/test-data/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cluster_id: clusterId,
          request_type: 'get_project_full',
          params: {
            project_key: projectKey,
            include_xy_data: true
          }
        })
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.message || `Failed to fetch project data: ${result.error}`);
        return;
      }

      setProject(result.data);
      setCached(result.cached || false);
    } catch (error: any) {
      console.error('Error fetching project:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <div className="text-lg font-medium text-gray-900 mt-4">
                Loading project data...
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Fetching from cluster (this may take 5-10 seconds)
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Project</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={fetchProjectData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-500">Project not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-gray-500 font-mono">{project.key}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">{project.sourceType}</span>
                {cached && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-green-600 text-sm">Cached</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {project.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Summary</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Overall Result</dt>
              <dd className={`text-lg font-semibold mt-1 ${
                project.summaryData?.overall_result === 'PASS' ? 'text-green-600' :
                project.summaryData?.overall_result === 'FAIL' ? 'text-red-600' :
                'text-gray-900'
              }`}>
                {project.summaryData?.overall_result || 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Measurements</dt>
              <dd className="text-lg font-semibold text-gray-900 mt-1">
                {project.originalResultsCount || project.categories?.length || 0}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Data Types</dt>
              <dd className="text-lg font-semibold text-gray-900 mt-1">
                {project.dataTypes?.join(', ') || 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Groups</dt>
              <dd className="text-lg font-semibold text-gray-900 mt-1">
                {project.groups?.join(', ') || 'N/A'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Test Configurations */}
        {project.testConfigurations && Object.keys(project.testConfigurations).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Test Configurations</h2>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(project.testConfigurations).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm font-medium text-gray-500">{key}</dt>
                  <dd className="text-sm text-gray-900 mt-1">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Statistics */}
        {project.summaryData?.statistics && Object.keys(project.summaryData.statistics).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Statistics</h2>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(project.summaryData.statistics).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm font-medium text-gray-500">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </dt>
                  <dd className="text-sm font-semibold text-gray-900 mt-1">
                    {typeof value === 'number' ? value.toFixed(2) : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Measurements */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            Measurements ({project.categories?.length || 0})
          </h2>
          <div className="space-y-3">
            {project.categories && project.categories.length > 0 ? (
              project.categories.map((category, index) => (
                <div key={category.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{category.categoryString}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {category.signalPath} • {category.measurementName} • {category.resultName}
                      </div>
                      {category.details && (
                        <div className="text-xs text-gray-400 mt-1">
                          {Object.entries(category.details)
                            .slice(0, 3)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(' • ')}
                        </div>
                      )}
                    </div>
                    <button
                      className="ml-4 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      onClick={() => {
                        // TODO: Implement chart modal
                        alert('Chart visualization coming soon!');
                      }}
                    >
                      View Chart
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                No measurements found
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
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
              <h3 className="text-sm font-medium text-blue-800">Data Fetched from Cluster</h3>
              <div className="mt-1 text-sm text-blue-700">
                This data was fetched in real-time from your local Centcom cluster.
                {cached && ' It is currently cached for faster access.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <DashboardLayout>
      <ProjectDetailContent />
    </DashboardLayout>
  );
}
