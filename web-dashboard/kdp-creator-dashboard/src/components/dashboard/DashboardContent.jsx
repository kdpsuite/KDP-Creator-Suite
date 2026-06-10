import { useState, useEffect } from 'react'
import { 
  FileText, 
  Image, 
  Zap, 
  Crown, 
  BarChart3, 
  Settings, 
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  LogOut,
  Loader2,
  Key,
  Moon,
  Sun,
  Save,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Input } from '@/components/ui/input.jsx'
import { authApi, subscriptionApi, analyticsApi, pdfApi, totpApi, batchApi, templateApi } from '@/lib/api'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function DashboardContent({ user, handleLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [subscription, setSubscription] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [resultData, setResultData] = useState(null)
  const [resultType, setResultType] = useState('image')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('kdp_dark_mode') === 'true')
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('kdp_dark_mode', darkMode)
  }, [darkMode])

  useEffect(() => {
    templateApi.getAll().then(res => setTemplates(res.data.templates))
  }, [])

  const saveTemplate = async (name, trimSize, bleed) => {
    await templateApi.save({ name, trim_size: trimSize, bleed })
    const res = await templateApi.getAll()
    setTemplates(res.data.templates)
  }

  const deleteTemplate = async (id) => {
    await templateApi.delete(id)
    const res = await templateApi.getAll()
    setTemplates(res.data.templates)
  }

  const handleImageConvert = async (file) => {
    if (!file) return;
    try {
      setIsProcessing(true);
      setPreviewImage(null);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('user_id', user.id);
      
      const response = await pdfApi.convertImage(formData);
      if (response.data.success) {
        setPreviewImage(response.data.preview);
        setResultData(response.data.image_data);
        setResultType('image');
        const metricsRes = await analyticsApi.getUserMetrics();
        setMetrics(metricsRes.data.metrics);
      }
    } catch (error) {
      console.error('Conversion failed', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePdfProcess = async (file) => {
    if (!file) return;
    try {
      setIsProcessing(true);
      setPreviewImage(null);
      setResultType('pdf');
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('user_id', user.id);
      formData.append('trim_size', document.getElementById('trim-size').value);
      formData.append('target_format', document.getElementById('target-format').value);
      
      const response = await pdfApi.convertToKdp(formData);
      if (response.data.success) {
        setPreviewImage(response.data.preview);
        setResultData(response.data.pdf_data);
        const metricsRes = await analyticsApi.getUserMetrics();
        setMetrics(metricsRes.data.metrics);
      }
    } catch (error) {
      console.error('PDF processing failed', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultData) return;
    const link = document.createElement('a');
    const mime = resultType === 'pdf' ? 'application/pdf' : 'image/png';
    const ext = resultType === 'pdf' ? 'pdf' : 'png';
    link.href = `data:${mime};base64,${resultData}`;
    link.download = `kdp_conversion_${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const [subRes, metricsRes] = await Promise.all([
          subscriptionApi.getStatus(),
          analyticsApi.getUserMetrics()
        ])
        setSubscription(subRes.data)
        setMetrics(metricsRes.data.metrics)
      } catch (error) {
        console.error('Failed to load dashboard data', error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  if (loading || !subscription || !metrics) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const { tier, tier_details, current_usage, remaining_usage } = subscription

  return (
    <div className="container mx-auto p-6">
      {/* Dashboard Content here - truncated for brevity in this step */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">KDP Creator Suite Dashboard</h1>
        <Button onClick={handleLogout} variant="outline">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader><CardTitle>Subscription</CardTitle></CardHeader>
              <CardContent>
                <Badge>{tier_details.name}</Badge>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Usage: {current_usage} / {tier_details.limits.conversions_per_month}</p>
                  <Progress value={(current_usage / tier_details.limits.conversions_per_month) * 100} className="mt-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
