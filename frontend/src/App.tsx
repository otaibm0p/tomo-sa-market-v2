import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { LanguageProvider } from './context/LanguageContext'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './ErrorBoundary'
import { SlaTickerProvider } from './shared/order-ui/SlaTimerContext'
import Header from './components/Header'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import BottomNav from './components/BottomNav'
import { ToastContainer } from './components/ui/ToastContainer'
import PromoStrip from './components/customer/PromoStrip'
import MobileCartBar from './components/MobileCartBar'

// Lazy load pages
const Home = lazy(() => import('./pages/Home'))
const Categories = lazy(() => import('./pages/Categories'))
const Products = lazy(() => import('./pages/Products'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Login = lazy(() => import('./pages/Login'))
const CustomerSignup = lazy(() => import('./pages/CustomerSignup'))
const CustomerLogin = lazy(() => import('./pages/CustomerLogin'))
const Orders = lazy(() => import('./pages/Orders'))
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'))
const Profile = lazy(() => import('./pages/Profile'))
const StaticPage = lazy(() => import('./pages/StaticPage'))
const Contact = lazy(() => import('./pages/Contact'))
const VisitorLogin = lazy(() => import('./pages/VisitorLogin'))
const Maintenance = lazy(() => import('./pages/Maintenance'))

// Admin Modules
const AdminLayout = lazy(() => import('./modules/admin/AdminLayout'))
const Dashboard = lazy(() => import('./modules/admin/Dashboard'))
const ProductsManagement = lazy(() => import('./modules/admin/ProductsManagement'))
const OrdersManagement = lazy(() => import('./modules/admin/OrdersManagement'))
const DeliveryManagement = lazy(() => import('./modules/admin/DeliveryManagement'))
const LiveDispatch = lazy(() => import('./modules/admin/LiveDispatch'))
const StoresManagement = lazy(() => import('./modules/admin/StoresManagement'))
const DeliveryMap = lazy(() => import('./modules/admin/DeliveryMap'))
const APIManagement = lazy(() => import('./modules/admin/APIManagement'))
const PaymentSettings = lazy(() => import('./modules/admin/PaymentSettings'))
const ControlCenter = lazy(() => import('./modules/admin/ControlCenter'))
const StaffManagement = lazy(() => import('./modules/admin/StaffManagement'))
const ShopSettings = lazy(() => import('./modules/admin/ShopSettings'))
const SiteSettings = lazy(() => import('./modules/admin/SiteSettings'))
const CategoriesTab = lazy(() => import('./modules/admin/CategoriesTab'))
const UICustomization = lazy(() => import('./modules/admin/UICustomization'))
const HeroSliderManagement = lazy(() => import('./modules/admin/HeroSliderManagement'))
const MissionControl = lazy(() => import('./modules/admin/MissionControl'))
const OrderDetailsView = lazy(() => import('./modules/admin/OrderDetailsView'))
const AccountantDashboard = lazy(() => import('./modules/admin/AccountantDashboard'))
const MarketingDashboard = lazy(() => import('./modules/admin/MarketingDashboard'))
const PromoStripSettings = lazy(() => import('./modules/admin/PromoStripSettings'))
const SiteLinksSettings = lazy(() => import('./modules/admin/SiteLinksSettings'))
const SiteContentSettings = lazy(() => import('./modules/admin/SiteContentSettings'))
const MarketingAudience = lazy(() => import('./modules/admin/MarketingAudience'))
const MarketingCampaigns = lazy(() => import('./modules/admin/MarketingCampaigns'))
const MarketingTemplates = lazy(() => import('./modules/admin/MarketingTemplates'))
const MarketingUTMBuilder = lazy(() => import('./modules/admin/MarketingUTMBuilder'))
const MarketingCoupons = lazy(() => import('./modules/admin/MarketingCoupons'))
const PromotionsManagement = lazy(() => import('./modules/admin/PromotionsManagement'))
const CategoryMarkupManagement = lazy(() => import('./modules/admin/CategoryMarkupManagement'))
const CourierWalletManagement = lazy(() => import('./modules/admin/CourierWalletManagement'))
const ZoneManagement = lazy(() => import('./modules/admin/ZoneManagement'))
const AuditLogViewer = lazy(() => import('./modules/admin/AuditLogViewer'))
const UsersList = lazy(() => import('./modules/admin/UsersList'))
const UserEdit = lazy(() => import('./modules/admin/UserEdit'))
const AdminChangePassword = lazy(() => import('./modules/admin/AdminChangePassword'))
const HomepageSectionsManagement = lazy(() => import('./modules/admin/HomepageSectionsManagement'))
const ManageHome = lazy(() => import('./modules/admin/ManageHome'))
const SiteContentManagement = lazy(() => import('./modules/admin/SiteContentManagement'))
const DispatchSettings = lazy(() => import('./modules/admin/DispatchSettings'))
const SitePasswordSettings = lazy(() => import('./modules/admin/SitePasswordSettings'))
const OpsDigest = lazy(() => import('./modules/admin/OpsDigest'))
const OpsLiveDispatchPage = lazy(() => import('./modules/admin/OpsLiveDispatchPage'))
const OpsBoardPage = lazy(() => import('./modules/admin/OpsBoardPage'))
const OpsRidersPage = lazy(() => import('./modules/admin/OpsRidersPage'))
const RidersConsole = lazy(() => import('./modules/admin/RidersConsole'))
const OpsSLAPlaceholder = lazy(() => import('./modules/admin/OpsSLAPlaceholder'))
const CatalogImportPlaceholder = lazy(() => import('./modules/admin/CatalogImportPlaceholder'))
const ExperienceSupportPlaceholder = lazy(() => import('./modules/admin/ExperienceSupportPlaceholder'))
const Guardrails = lazy(() => import('./modules/admin/Guardrails'))
const DecisionLog = lazy(() => import('./modules/admin/DecisionLog'))
const OpsMonitor = lazy(() => import('./modules/admin/OpsMonitor'))
const CatalogWatch = lazy(() => import('./modules/admin/CatalogWatch'))
const AdminCopilot = lazy(() => import('./modules/admin/AdminCopilot'))
const ProfitGuard = lazy(() => import('./modules/admin/ProfitGuard'))
const ActivityLog = lazy(() => import('./modules/admin/ActivityLog'))

// Delivery Module
const DriverRegistration = lazy(() => import('./modules/delivery/DriverRegistration'))
const DriverDashboard = lazy(() => import('./modules/delivery/DriverDashboard'))
const DriverLogin = lazy(() => import('./modules/delivery/DriverLogin'))
const DriverLayout = lazy(() => import('./modules/delivery/DriverLayout'))
const DriverHome = lazy(() => import('./modules/delivery/DriverHome'))
const DriverSettings = lazy(() => import('./modules/delivery/DriverSettings'))
const DriverSignup = lazy(() => import('./pages/DriverSignup'))

// Store Module
const StoreLogin = lazy(() => import('./modules/store/StoreLogin'))
const StoreDashboard = lazy(() => import('./modules/store/StoreDashboard'))
const StoreEntry = lazy(() => import('./modules/store/StoreEntry'))

// Public Layout
function PublicLayout({ children }: { children: React.ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleOpenCart = () => setIsCartOpen(true)
    window.addEventListener('open-cart', handleOpenCart)
    return () => window.removeEventListener('open-cart', handleOpenCart)
  }, [])

  const hideBottomNav =
    location.pathname.startsWith('/checkout') ||
    location.pathname.startsWith('/cart') ||
    location.pathname.startsWith('/product/')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-['Tajawal']">
      <ToastContainer />
      <Header onCartClick={() => setIsCartOpen(true)} />
      <PromoStrip />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <main className="flex-grow">
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
          {children}
        </Suspense>
      </main>
      <Footer />
      <MobileCartBar bottomNavVisible={!hideBottomNav} />
      <BottomNav hidden={hideBottomNav} />
    </div>
  )
}

function PortalHomeRedirect() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const host = window.location.hostname || ''
    const path = location.pathname

    // Safe: only redirect on root path to avoid breaking deep links
    if (path !== '/' && path !== '') return

    if (host.startsWith('admin.')) {
      navigate('/admin', { replace: true })
      return
    }
    if (host.startsWith('store.')) {
      navigate('/store', { replace: true })
      return
    }
    if (host.startsWith('driver.')) {
      navigate('/driver', { replace: true })
      return
    }
  }, [location.pathname, navigate])

  return null
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <CartProvider>
            <SlaTickerProvider>
            <Router>
              <PortalHomeRedirect />
              <Routes>
                {/* Admin Routes */}
                <Route path="/admin" element={<Suspense fallback={<div>Loading Admin...</div>}><AdminLayout /></Suspense>}>
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={<ProductsManagement />} />
                  <Route path="orders" element={<OrdersManagement />} />
                  <Route path="delivery" element={<DeliveryManagement />} />
                  <Route path="dispatch" element={<LiveDispatch />} />
                  <Route path="stores" element={<StoresManagement />} />
                  <Route path="delivery-map" element={<DeliveryMap />} />
                  <Route path="api" element={<APIManagement />} />
                  <Route path="payment" element={<PaymentSettings />} />
                  <Route path="control" element={<ControlCenter />} />
                  <Route path="staff" element={<StaffManagement />} />
                  <Route path="users" element={<UsersList />} />
                  <Route path="users/:id" element={<UserEdit />} />
                  <Route path="change-password" element={<AdminChangePassword />} />
                  <Route path="settings" element={<ShopSettings />} />
                  <Route path="site-settings" element={<SiteSettings />} />
                  <Route path="categories" element={<CategoriesTab />} />
                  <Route path="customization" element={<UICustomization />} />
                  <Route path="hero-slider" element={<HeroSliderManagement />} />
                  <Route path="mission-control" element={<MissionControl />} />
                  <Route path="ops" element={<OpsDigest />} />
                  <Route path="ops/board" element={<OpsBoardPage />} />
                  <Route path="ops/live-dispatch" element={<OpsLiveDispatchPage />} />
                  <Route path="riders" element={<RidersConsole />} />
                  <Route path="ops/riders" element={<OpsRidersPage />} />
                  <Route path="ops/sla" element={<OpsSLAPlaceholder />} />
                  <Route path="experience/support" element={<ExperienceSupportPlaceholder />} />
                  {/* Legacy/alias redirects (no route breakage) */}
                  <Route path="tracking" element={<Navigate to="/admin/delivery-map" replace />} />
                  <Route path="catalog/import" element={<CatalogImportPlaceholder />} />
                  <Route path="accounting" element={<Navigate to="/admin/accountant" replace />} />
                  <Route path="accountant/reports" element={<Navigate to="/admin/accountant" replace />} />
                  <Route path="accountant/exports" element={<Navigate to="/admin/accountant" replace />} />
                  <Route path="accountant/settlements" element={<Navigate to="/admin/accountant" replace />} />
                  <Route path="marketing/promo" element={<Navigate to="/admin/marketing/promo-strip" replace />} />
                  <Route path="marketing/hero" element={<Navigate to="/admin/hero-slider" replace />} />
                  <Route path="guardrails" element={<Guardrails />} />
                  <Route path="decisions" element={<DecisionLog />} />
                  <Route path="ops-monitor" element={<OpsMonitor />} />
                  <Route path="catalog-watch" element={<CatalogWatch />} />
                  <Route path="copilot" element={<AdminCopilot />} />
                  <Route path="profit-guard" element={<ProfitGuard />} />
                  <Route path="activity" element={<ActivityLog />} />
                  <Route path="orders/:orderId" element={<OrderDetailsView />} />
                  <Route path="accountant" element={<AccountantDashboard />} />
                  <Route path="marketing" element={<MarketingDashboard />} />
                  <Route path="marketing/audience" element={<MarketingAudience />} />
                  <Route path="marketing/templates" element={<MarketingTemplates />} />
                  <Route path="marketing/promo-strip" element={<PromoStripSettings />} />
                  <Route path="marketing/site-links" element={<SiteLinksSettings />} />
                  <Route path="marketing/site-content" element={<SiteContentSettings />} />
                  <Route path="marketing/campaigns" element={<MarketingCampaigns />} />
                  <Route path="marketing/utm" element={<MarketingUTMBuilder />} />
                  <Route path="marketing/coupons" element={<MarketingCoupons />} />
                  <Route path="promotions" element={<PromotionsManagement />} />
                  <Route path="category-markup" element={<CategoryMarkupManagement />} />
                  <Route path="courier-wallets" element={<CourierWalletManagement />} />
                  <Route path="zones" element={<ZoneManagement />} />
                  <Route path="audit-logs" element={<AuditLogViewer />} />
                  <Route path="audit" element={<AuditLogViewer />} />
                  <Route path="homepage-sections" element={<HomepageSectionsManagement />} />
                  <Route path="manage-home" element={<ManageHome />} />
                  <Route path="site-content" element={<SiteContentManagement />} />
                  <Route path="dispatch-settings" element={<DispatchSettings />} />
                  <Route path="site-password" element={<SitePasswordSettings />} />
                </Route>
                
                {/* Maintenance Route (No Layout) */}
                <Route path="/maintenance" element={<Maintenance />} />
                
                {/* Public Routes */}
                <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
                <Route path="/categories" element={<PublicLayout><Categories /></PublicLayout>} />
                <Route path="/products" element={<PublicLayout><Products /></PublicLayout>} />
                <Route path="/product/:id" element={<PublicLayout><ProductDetail /></PublicLayout>} />
                <Route path="/cart" element={<PublicLayout><Cart /></PublicLayout>} />
                <Route path="/checkout" element={<PublicLayout><Checkout /></PublicLayout>} />
                <Route path="/signup" element={<PublicLayout><CustomerSignup /></PublicLayout>} />
                <Route path="/login" element={<PublicLayout><CustomerLogin /></PublicLayout>} />
                <Route path="/admin/login" element={<div className="min-h-screen flex items-center justify-center bg-gray-100 p-4"><Suspense fallback={<div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}><Login /></Suspense></div>} />
                <Route path="/profile" element={<PublicLayout><Profile /></PublicLayout>} />
                <Route path="/orders" element={<PublicLayout><Orders /></PublicLayout>} />
                <Route path="/orders/:id" element={<PublicLayout><OrderDetail /></PublicLayout>} />
                <Route path="/order-success/:orderId" element={<PublicLayout><OrderSuccess /></PublicLayout>} />
                <Route path="/privacy" element={<Navigate to="/p/privacy" replace />} />
                <Route path="/terms" element={<Navigate to="/p/terms" replace />} />
                <Route path="/about" element={<Navigate to="/p/about" replace />} />
                <Route path="/faq" element={<Navigate to="/p/faq" replace />} />
                <Route path="/shipping-returns" element={<Navigate to="/p/shipping-returns" replace />} />
                <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
                <Route path="/p/:slug" element={<PublicLayout><StaticPage /></PublicLayout>} />
                
                {/* Driver Routes */}
                <Route path="/driver/login" element={<DriverLogin />} />
                <Route path="/driver/register" element={<Suspense fallback={<div>Loading...</div>}><DriverRegistration /></Suspense>} />
                <Route path="/driver" element={<Suspense fallback={<div>Loading...</div>}><DriverLayout /></Suspense>}>
                  <Route index element={<DriverDashboard />} />
                  <Route path="dashboard" element={<DriverDashboard />} />
                  <Route path="tasks" element={<DriverDashboard />} />
                  <Route path="map" element={<DriverDashboard />} />
                  <Route path="settings" element={<DriverSettings />} />
                </Route>
                <Route path="/driver-signup" element={<PublicLayout><DriverSignup /></PublicLayout>} />
                
                {/* Store Routes */}
                <Route path="/store" element={<Suspense fallback={<div>Loading...</div>}><StoreEntry /></Suspense>} />
                <Route path="/store/dashboard" element={<Suspense fallback={<div>Loading...</div>}><StoreDashboard /></Suspense>} />
              </Routes>
            </Router>
            </SlaTickerProvider>
          </CartProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
