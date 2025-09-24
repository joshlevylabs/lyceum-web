"use client"

import React from 'react';
import EnhancedClusterAdmin from '@/components/EnhancedClusterAdmin';

export default function ClusterManagementPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <EnhancedClusterAdmin />
      </div>
    </div>
  );
}
