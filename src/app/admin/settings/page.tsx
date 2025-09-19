export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage admin configuration and licensing setup.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a href="/admin/debug-licenses" className="block rounded border p-4 hover:bg-gray-50">
          <h2 className="font-semibold">Licensing Debug Tool</h2>
          <p className="text-sm text-gray-600">Create tables, test license creation and validation.</p>
        </a>
        <a href="/admin/setup-enhanced-licensing" className="block rounded border p-4 hover:bg-gray-50">
          <h2 className="font-semibold">Setup Enhanced Licensing</h2>
          <p className="text-sm text-gray-600">Run schema updates and configuration.</p>
        </a>
        <a href="/admin/health" className="block rounded border p-4 hover:bg-gray-50">
          <h2 className="font-semibold">System Health</h2>
          <p className="text-sm text-gray-600">Check environment and database connectivity.</p>
        </a>
      </div>
    </div>
  )
}





