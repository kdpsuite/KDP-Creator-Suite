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
  Trash2,
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Input } from '@/components/ui/input.jsx'
import { authApi, subscriptionApi, analyticsApi, pdfApi, totpApi, batchApi, templateApi } from '@/lib/api'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts'

// Phase 1-3 Components
import { SkeletonLoader } from '@/components/SkeletonLoader'
import { EmptyState } from '@/components/EmptyState'
import { Tooltip } from '@/components/Tooltip'
import { PageTransition } from '@/components/animations/PageTransition'
import { OnboardingTooltip } from '@/components/onboarding/OnboardingTooltip'
import { useOnboarding } from '@/hooks/useOnboarding'
import { EmptyProjectsIllustration } from '@/components/illustrations/EmptyProjectsIllustration'
import { EmptyAnalyticsIllustration } from '@/components/illustrations/EmptyAnalyticsIllustration'

import * as pdfjs from 'pdfjs-dist'
import 'pdfjs-dist/build/pdf.worker.min.mjs'

pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'

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
      formData.append("file", file);
      const trimSize = document.getElementById("coloring-trim-size").value;
      formData.append("trim_size", trimSize);
      
      const response = await pdfApi.convertColoring(formData);
      if (response.data.success) {
        setPreviewImage(response.data.preview);
        setResultData(response.data.download_url);
        setResultType("image");
        const metricsRes = await analyticsApi.getUserMetrics();
        setMetrics(metricsRes.data.data.metrics);
      }
    } catch (error) {
      console.error("Coloring conversion failed", error);
      alert(`Coloring Conversion Error: ${error.message || "An unknown error occurred."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const KDP_TRIM_SIZES = {
    '6x9': { width: 6, height: 9 },
    '8.5x11': { width: 8.5, height: 11 },
    '5.5x8.5': { width: 5.5, height: 8.5 },
  };
  const BLEED_SIZE = 0.125;

  const validatePdfDimensions = async (file, trimSize, targetFormat) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });

    const pdfWidth = viewport.width / 72; // Convert points to inches
    const pdfHeight = viewport.height / 72; // Convert points to inches

    let expectedWidth = KDP_TRIM_SIZES[trimSize].width;
    let expectedHeight = KDP_TRIM_SIZES[trimSize].height;

    if (targetFormat === 'kdp-print') { // Assuming 'kdp-print' implies bleed
      expectedWidth += BLEED_SIZE;
      expectedHeight += BLEED_SIZE * 2; // Top and bottom bleed
    }

    const dimensionMatch = (
      Math.abs(pdfWidth - expectedWidth) < 0.05 &&
      Math.abs(pdfHeight - expectedHeight) < 0.05
    );

    if (!dimensionMatch) {
      return `Dimension mismatch. Expected ${expectedWidth.toFixed(2)}x${expectedHeight.toFixed(2)} inches, got ${pdfWidth.toFixed(2)}x${pdfHeight.toFixed(2)} inches.`;
    }
    return null; // No error
  };

  const handlePdfProcess = async (file) => {
    if (!file) return;
    try {
      setIsProcessing(true);
      setPreviewImage(null);
      setResultType('pdf');

      const trimSize = document.getElementById('trim-size').value;
      const targetFormat = document.getElementById('target-format').value;

      // No client-side validation for coloring book conversion, as backend handles sizing.

      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('user_id', user.id);
      formData.append('trim_size', trimSize);
      formData.append('target_format', targetFormat);
      
      const response = await pdfApi.convertToKdp(formData);
      if (response.data.success) {
        setPreviewImage(response.data.preview);
        setResultData(response.data.pdf_data);
        const metricsRes = await analyticsApi.getUserMetrics();
        setMetrics(metricsRes.data.metrics);
      }
    } catch (error) {
      console.error('PDF processing failed', error);
      alert(`PDF Processing Error: ${error.message || 'An unknown error occurred.'}`);
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
        setSubscription(subRes.data.data)
        setMetrics(metricsRes.data.data.metrics)
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
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div className="h-10 w-64 bg-muted rounded animate-shimmer" />
          <div className="h-10 w-24 bg-muted rounded animate-shimmer" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonLoader count={3} />
        </div>
        <div className="h-96 w-full bg-muted rounded animate-shimmer" />
      </div>
    )
  }

  const { tier, tier_details, current_usage, remaining_usage } = subscription
  const conversionsUsed = current_usage?.conversions ?? current_usage ?? 0
  const conversionsLimit = tier_details?.monthly_conversions ?? tier_details?.limits?.conversions_per_month ?? 0

  const { shouldShowTooltip, dismissTooltip } = useOnboarding()
  
  return (
    <div className="container mx-auto p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight">KDP Creator Suite</h1>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-full"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button onClick={handleLogout} variant="outline" className="hover:shadow-md">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="glass p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="tools" className="rounded-lg">Tools</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg">Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PageTransition stagger={true} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subscription</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{tier_details.name}</div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                    {remaining_usage} left
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Monthly Usage</span>
                    <span>{conversionsUsed} / {conversionsLimit === -1 ? 'Unlimited' : conversionsLimit}</span>
                  </div>
                  <Progress value={conversionsLimit === -1 ? 100 : (conversionsUsed / conversionsLimit) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="card glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.total_conversions || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all formats
                </p>
              </CardContent>
            </Card>

            <Card className="card glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(metrics.storage_used_mb || 0).toFixed(1)} MB</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cloud asset storage
                </p>
              </CardContent>
            </Card>
          </PageTransition>
          
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Recent Projects</h2>
            {templates.length === 0 ? (
              <EmptyState 
                icon={<EmptyProjectsIllustration />}
                title="No projects yet"
                description="Create your first KDP project to start optimizing your publishing workflow."
                action={{ label: "Create Project", onClick: () => setActiveTab('tools') }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(t => (
                  <Card key={t.id} className="card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{t.name}</CardTitle>
                      <CardDescription>{t.trim_size} • {t.bleed ? 'Bleed' : 'No Bleed'}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => setActiveTab('tools')} className="transition-premium">
                        Open
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tools">
          <PageTransition className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="card glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    KDP PDF Converter
                    <Tooltip content="Convert standard PDFs to KDP-compliant print-ready files">
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>Professional print-ready conversion</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Trim Size</label>
                      <select id="trim-size" className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20">
                        <option value="6x9">6 x 9 in</option>
                        <option value="8.5x11">8.5 x 11 in</option>
                        <option value="5.5x8.5">5.5 x 8.5 in</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target Format</label>
                      <select id="target-format" className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20">
                        <option value="kdp-print">KDP Print (with bleed)</option>
                        <option value="kdp-ebook">KDP eBook</option>
                      </select>
                    </div>
                  </div>
                  
                  <OnboardingTooltip 
                    content="Upload your PDF here. We'll automatically format it for KDP."
                    tooltipId="pdf-upload-tooltip"
                    isOpen={shouldShowTooltip('pdf-upload-tooltip')}
                    onDismiss={() => dismissTooltip('pdf-upload-tooltip')}
                    position="top"
                  >
                    <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative group">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-4 group-hover:text-primary transition-colors" />
                      <p className="text-sm text-muted-foreground mb-2">Drag & drop your PDF here</p>
                      <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
                      <Input 
                        type="file" 
                        accept=".pdf" 
                        onChange={(e) => handlePdfProcess(e.target.files[0])} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </OnboardingTooltip>
                </CardContent>
              </Card>

              <Card className="card glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Image to Coloring Book
                    <Tooltip content="Convert any image into a high-quality coloring page">
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>AI-powered line art extraction</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Trim Size</label>
                      <select id="coloring-trim-size" className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20">
                        <option value="6x9">6 x 9 in</option>
                        <option value="8.5x11">8.5 x 11 in</option>
                        <option value="5.5x8.5">5.5 x 8.5 in</option>
                      </select>
                    </div>
                  </div>
                  <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative group">
                    <Image className="h-8 w-8 mx-auto text-muted-foreground mb-4 group-hover:text-primary transition-colors" />
                    <p className="text-sm text-muted-foreground mb-2">Upload image to convert</p>
                    <p className="text-xs text-muted-foreground mb-4">Supports JPG, PNG</p>
                    <Input 
                      type="file" 
                      accept=".jpg,.jpeg,.png" 
                      onChange={(e) => handleImageConvert(e.target.files[0])} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {isProcessing && (
              <Card className="card glass border-primary/20">
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Processing your file...</h3>
                  <p className="text-muted-foreground">This may take a few moments depending on file size.</p>
                </CardContent>
              </Card>
            )}

            {previewImage && !isProcessing && (
              <Card className="card glass border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Processing Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="aspect-video relative rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                    <img 
                      src={`data:image/png;base64,${previewImage}`} 
                      alt="Preview" 
                      className="max-h-full object-contain"
                    />
                  </div>
                  <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={() => {
                      setPreviewImage(null)
                      setResultData(null)
                    }}>
                      Process Another
                    </Button>
                    <Button onClick={downloadResult} className="transition-premium">
                      <Download className="mr-2 h-4 w-4" />
                      Download {resultType === 'pdf' ? 'PDF' : 'Image'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </PageTransition>
        </TabsContent>

        <TabsContent value="analytics">
          <PageTransition className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="card glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Processing Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">2.4h</div>
                  <p className="text-xs text-green-500 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" /> +12% from last month
                  </p>
                </CardContent>
              </Card>
              <Card className="card glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">99.8%</div>
                  <p className="text-xs text-green-500 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" /> +0.2% from last month
                  </p>
                </CardContent>
              </Card>
              <Card className="card glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">API Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">1,284</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This billing cycle
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card glass">
                <CardHeader>
                  <CardTitle>Usage Trends</CardTitle>
                  <CardDescription>Conversions over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { name: 'Mon', value: 12 },
                      { name: 'Tue', value: 19 },
                      { name: 'Wed', value: 15 },
                      { name: 'Thu', value: 22 },
                      { name: 'Fri', value: 28 },
                      { name: 'Sat', value: 14 },
                      { name: 'Sun', value: 8 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="card glass">
                <CardHeader>
                  <CardTitle>Format Distribution</CardTitle>
                  <CardDescription>Breakdown of output formats</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'KDP Print', value: 65 },
                          { name: 'KDP eBook', value: 20 },
                          { name: 'Coloring Pages', value: 15 },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--primary))" opacity={0.6} />
                        <Cell fill="hsl(var(--primary))" opacity={0.3} />
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </PageTransition>
        </TabsContent>

        <TabsContent value="settings">
          <PageTransition className="max-w-2xl mx-auto space-y-6">
            <Card className="card glass">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your profile and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input value={user.email} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Key</label>
                  <div className="flex gap-2">
                    <Input value="sk_live_**********************" disabled className="bg-muted/50 font-mono text-sm" />
                    <Button variant="outline">Regenerate</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Use this key to authenticate with the KDP Creator API.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="card glass border-destructive/20">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible account actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Delete Account & Data
                </Button>
              </CardContent>
            </Card>
          </PageTransition>
        </TabsContent>
      </Tabs>
    </div>
  )
}
