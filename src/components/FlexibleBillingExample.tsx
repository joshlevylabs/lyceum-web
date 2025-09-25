'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BillingLineItem {
  name: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface BillingPreview {
  lineItems: BillingLineItem[]
  totalAmount: number
  monthlyTotal: string
  summary: string
}

export default function FlexibleBillingExample() {
  const [preview, setPreview] = useState<BillingPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [customConfig, setCustomConfig] = useState({
    licenses: [
      { type: 'professional', quantity: 2 },
      { type: 'basic', quantity: 3 }
    ],
    clusters: [
      { size: 'medium', type: 'production', quantity: 1 },
      { size: 'small', type: 'development', quantity: 2 }
    ],
    additionalUsers: 5,
    storageOverageGB: 10
  })

  // Load current billing preview
  useEffect(() => {
    loadBillingPreview()
  }, [])

  const loadBillingPreview = async () => {
    try {
      setLoading(true)
      
      // Get auth token from localStorage (same as PaymentMethodSetup)
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token
      
      if (!accessToken) {
        console.error('No access token found')
        return
      }
      
      const response = await fetch('/api/stripe/billing-preview', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setPreview(data.preview)
      }
    } catch (error) {
      console.error('Failed to load billing preview:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateCustomPreview = async () => {
    try {
      setLoading(true)
      
      // Get auth token from localStorage 
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token
      
      if (!accessToken) {
        console.error('No access token found')
        return
      }
      
      const response = await fetch('/api/stripe/billing-preview', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(customConfig)
      })
      if (response.ok) {
        const data = await response.json()
        setPreview(data.preview)
      }
    } catch (error) {
      console.error('Failed to calculate preview:', error)
    } finally {
      setLoading(false)
    }
  }

  const createFlexibleCheckout = async () => {
    try {
      setLoading(true)
      
      // Get auth token from localStorage 
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token
      
      if (!accessToken) {
        console.error('No access token found')
        return
      }
      
      const response = await fetch('/api/stripe/create-flexible-checkout', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(customConfig)
      })
      
      if (response.ok) {
        const data = await response.json()
        // Redirect to Stripe checkout
        window.location.href = data.url
      } else {
        const error = await response.json()
        alert(`Failed to create checkout: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to create checkout:', error)
      alert('Failed to create checkout session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Flexible Billing System</CardTitle>
          <CardDescription>
            Dynamic pricing based on actual usage: licenses, clusters, users, and storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Current Billing Preview */}
          {preview && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Billing Preview: {preview.monthlyTotal}/month</h3>
              <div className="space-y-2">
                {preview.lineItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-500 ml-2">({item.description})</span>
                    </div>
                    <span>${(item.totalPrice / 100).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total Monthly Cost</span>
                  <span>{preview.monthlyTotal}</span>
                </div>
              </div>
            </div>
          )}

          {/* Example Configuration */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Current Licenses</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 2x Professional ($15/month each)</li>
                <li>• 3x Basic ($5/month each)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Current Clusters</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 1x Medium Production ($80/month)</li>
                <li>• 2x Small Development ($20/month each)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Additional Usage</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 5 Additional Users ($3/month each)</li>
                <li>• 10GB Storage Overage ($0.10/GB)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Base Costs</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Platform Base Fee ($10/month)</li>
                <li>• Everything else usage-based</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button 
              onClick={calculateCustomPreview}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Calculating...' : 'Recalculate Preview'}
            </Button>
            
            <Button 
              onClick={createFlexibleCheckout}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Creating...' : 'Subscribe with Flexible Pricing'}
            </Button>
          </div>

          {/* Pricing Benefits */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Benefits of Flexible Pricing:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>✅ Pay only for what you actually use</li>
              <li>✅ Scales automatically with your needs</li>
              <li>✅ No complex tier migrations</li>
              <li>✅ Transparent, itemized billing</li>
              <li>✅ Perfect for varying workloads</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
