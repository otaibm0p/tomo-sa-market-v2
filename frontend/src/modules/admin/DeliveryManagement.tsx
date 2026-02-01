
import { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'

interface Driver {
  id: number
  user_id: number
  name: string
  email: string
  phone: string
  vehicle_type: string
  id_number: string
  license_number: string
  is_active: boolean
  is_approved: boolean
  status: string
  user_active: boolean
  created_at: string
  rider_status?: 'available' | 'busy' | 'offline' | 'delivering'
  active_orders_count?: number
  orders_this_month?: number
  wallet_balance?: number
  base_commission_per_order?: number
  bonus_threshold?: number
  bonus_amount?: number
  payout_frequency?: string
  avg_rating?: number
  total_ratings?: number
}

interface RiderRule {
  rule_key: string
  name: string
  is_enabled: boolean
  settings: any
  description: string
}

export default function DeliveryManagement() {
  const { language } = useLanguage()
  const [approvedDrivers, setApprovedDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  
  // Sovereign Rules State
  const [rules, setRules] = useState<RiderRule[]>([])
  const [savingRules, setSavingRules] = useState(false)

  // Financial Modal State (Individual)
  const [showFinancialModal, setShowFinancialModal] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [financialForm, setFinancialForm] = useState({
    base_commission_per_order: 9,
    bonus_threshold: 500,
    bonus_amount: 150,
    payout_frequency: 'Weekly'
  })
  
  // Manual Adjustment State
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadDrivers(), loadRules()])
    setLoading(false)
  }

  const loadRules = async () => {
    try {
      const res = await api.get('/api/admin/rider-rules')
      setRules(res.data || [])
    } catch (err) {
      console.error('Error loading rules:', err)
    }
  }

  const loadDrivers = async () => {
    try {
      const res = await api.get('/api/admin/riders')
      const riders = res.data.riders || []
      setApprovedDrivers(riders.filter((d: Driver) => d.is_approved))
    } catch (err) {
      console.error('Error loading riders:', err)
    }
  }

  const updateRule = async (key: string, is_enabled: boolean, settings: any) => {
    setSavingRules(true)
    try {
      await api.put(`/api/admin/rider-rules/${key}`, { is_enabled, settings })
      
      // If Global Commission or Bonus Target changed, sync to all drivers for consistency
      // (Optional but good for "Sovereign Control")
      if (key === 'global_commission' && is_enabled) {
         // Sync commission value if needed
      }
      
      await loadRules()
      alert(language === 'en' ? 'Rule updated successfully' : 'تم تحديث القاعدة بنجاح')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating rule')
    } finally {
      setSavingRules(false)
    }
  }

  const handleRuleToggle = (key: string, currentStatus: boolean) => {
    const rule = rules.find(r => r.rule_key === key)
    if (rule) {
      updateRule(key, !currentStatus, rule.settings)
    }
  }

  const handleRuleSettingChange = (key: string, settingKey: string, value: string) => {
    const rule = rules.find(r => r.rule_key === key)
    if (rule) {
      const newSettings = { ...rule.settings, [settingKey]: value }
      // Update local state immediately for input responsiveness
      setRules(rules.map(r => r.rule_key === key ? { ...r, settings: newSettings } : r))
    }
  }

  const saveRuleSettings = (key: string) => {
    const rule = rules.find(r => r.rule_key === key)
    if (rule) {
      updateRule(key, rule.is_enabled, rule.settings)
    }
  }

  const openFinancialModal = (driver: Driver) => {
    setSelectedDriver(driver)
    setFinancialForm({
      base_commission_per_order: Number(driver.base_commission_per_order) || 9,
      bonus_threshold: Number(driver.bonus_threshold) || 500,
      bonus_amount: Number(driver.bonus_amount) || 150,
      payout_frequency: driver.payout_frequency || 'Weekly'
    })
    setAdjustmentAmount('')
    setAdjustmentReason('')
    setShowFinancialModal(true)
  }

  const saveFinancialSettings = async () => {
    if (!selectedDriver) return
    try {
      await api.put(`/api/admin/drivers/${selectedDriver.id}/financials`, financialForm)
      setShowFinancialModal(false)
      loadDrivers() 
      alert(language === 'en' ? 'Saved' : 'تم الحفظ')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error')
    }
  }

  const submitAdjustment = async () => {
    if (!selectedDriver || !adjustmentAmount || !adjustmentReason) return
    if (!confirm('Are you sure you want to adjust this wallet balance?')) return

    setAdjusting(true)
    try {
      await api.post(`/api/admin/riders/${selectedDriver.id}/adjustment`, {
        amount: parseFloat(adjustmentAmount),
        reason: adjustmentReason
      })
      alert('Balance adjusted successfully')
      loadDrivers() // Refresh balance
      setAdjustmentAmount('')
      setAdjustmentReason('')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error adjusting balance')
    } finally {
      setAdjusting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const targetBonusRule = rules.find(r => r.rule_key === 'target_bonus');
  const globalCommissionRule = rules.find(r => r.rule_key === 'global_commission');
  const manualOverrideRule = rules.find(r => r.rule_key === 'manual_override');

  return (
    <div className="space-y-8" style={{ fontFamily: 'Cairo, sans-serif' }}>
      
      {/* SOVEREIGN CONTROL HUB */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-2xl shadow-2xl text-white">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          👑 {language === 'en' ? 'Sovereign Control Hub' : 'مركز التحكم السيادي'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Rule A: Target Bonus */}
          <div className={`p-4 rounded-xl border ${targetBonusRule?.is_enabled ? 'bg-white/10 border-emerald-500/50' : 'bg-red-900/20 border-red-500/30'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Rule A: Bonus</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={targetBonusRule?.is_enabled || false}
                  onChange={() => handleRuleToggle('target_bonus', targetBonusRule?.is_enabled || false)}
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Target (Orders)</label>
                <input 
                  type="number" 
                  value={targetBonusRule?.settings?.target || 500}
                  onChange={(e) => handleRuleSettingChange('target_bonus', 'target', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                  disabled={!targetBonusRule?.is_enabled}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Bonus Amount (SAR)</label>
                <input 
                  type="number" 
                  value={targetBonusRule?.settings?.amount || 150}
                  onChange={(e) => handleRuleSettingChange('target_bonus', 'amount', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                  disabled={!targetBonusRule?.is_enabled}
                />
              </div>
              <button 
                onClick={() => saveRuleSettings('target_bonus')}
                className="w-full py-1 text-xs bg-emerald-700 hover:bg-emerald-600 rounded text-white"
              >
                Save
              </button>
            </div>
          </div>

          {/* Rule B: Global Commission */}
          <div className={`p-4 rounded-xl border ${globalCommissionRule?.is_enabled ? 'bg-white/10 border-blue-500/50' : 'bg-red-900/20 border-red-500/30'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Rule B: Commission</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={globalCommissionRule?.is_enabled || false}
                  onChange={() => handleRuleToggle('global_commission', globalCommissionRule?.is_enabled || false)}
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Standard Fee (SAR)</label>
                <input 
                  type="number" 
                  value={globalCommissionRule?.settings?.amount || 9}
                  onChange={(e) => handleRuleSettingChange('global_commission', 'amount', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                  disabled={!globalCommissionRule?.is_enabled}
                />
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {globalCommissionRule?.is_enabled ? '✅ Active on all riders' : '❌ Commission Disabled'}
              </div>
              <button 
                onClick={() => saveRuleSettings('global_commission')}
                className="w-full py-1 text-xs bg-blue-700 hover:bg-blue-600 rounded text-white"
              >
                Save
              </button>
            </div>
          </div>

          {/* Rule C: Manual Override (Freeze) */}
          <div className={`p-4 rounded-xl border ${manualOverrideRule?.is_enabled ? 'bg-red-900/50 border-red-500' : 'bg-white/10 border-gray-500/30'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-red-400">Rule C: Override</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={manualOverrideRule?.is_enabled || false}
                  onChange={() => handleRuleToggle('manual_override', manualOverrideRule?.is_enabled || false)}
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
            
            <p className="text-sm text-gray-300 mb-4">
              Master Switch: Freeze all rewards and commissions instantly.
            </p>
            {manualOverrideRule?.is_enabled && (
              <div className="bg-red-600 text-white text-center py-2 rounded font-bold animate-pulse">
                ⛔ SYSTEM FROZEN
              </div>
            )}
          </div>

        </div>
      </div>

      {/* RIDER LIST */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-lg">
            {language === 'en' ? 'Fleet Management' : 'إدارة الأسطول'}
          </h3>
          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
            {approvedDrivers.length} Riders
          </span>
        </div>
        
        <table className="w-full">
          <thead>
            <tr className="text-right text-gray-500 text-sm border-b">
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Applied Rules</th>
              <th className="px-6 py-4 font-semibold">Performance</th>
              <th className="px-6 py-4 font-semibold">Balance</th>
              <th className="px-6 py-4 font-semibold w-24">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {approvedDrivers.map((driver) => {
              // Status Logic
              let statusConfig = { text: 'Offline', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
              if (driver.rider_status === 'delivering') {
                statusConfig = { text: 'Delivering', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500 animate-pulse' }
              } else if (driver.rider_status === 'available') {
                statusConfig = { text: 'Online', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' }
              }

              // Applied Rules Logic
              const appliedRules = []
              if (manualOverrideRule?.is_enabled) appliedRules.push('⛔ Frozen')
              else {
                if (globalCommissionRule?.is_enabled) appliedRules.push('Fee: ' + (globalCommissionRule.settings.amount || 9))
                if (targetBonusRule?.is_enabled) appliedRules.push('Bonus: ' + (targetBonusRule.settings.target || 500))
              }

              return (
                <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div>{driver.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{driver.phone}</div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${statusConfig.color} border-opacity-20`}>
                      <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></span>
                      {statusConfig.text}
                    </div>
                  </td>

                  {/* Applied Rules */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {appliedRules.map((rule, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded border border-gray-200">
                          {rule}
                        </span>
                      ))}
                      {appliedRules.length === 0 && <span className="text-xs text-gray-400">-</span>}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{driver.orders_this_month || 0}</span>
                      <span className="text-xs text-gray-400">Orders</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 font-mono font-medium text-gray-800">
                    {Number(driver.wallet_balance || 0).toFixed(2)}
                  </td>

                  <td className="px-6 py-4">
                    <button 
                      onClick={() => openFinancialModal(driver)}
                      className="text-gray-400 hover:text-gray-800 transition-colors"
                    >
                      ⚙️
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* INDIVIDUAL MODAL + MANUAL ADJUSTMENT */}
      {showFinancialModal && selectedDriver && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold mb-4 flex items-center justify-between border-b pb-4">
              <span>{selectedDriver.name}</span>
              <button onClick={() => setShowFinancialModal(false)} className="text-gray-400 hover:text-red-500">✕</button>
            </h3>
            
            <div className="space-y-6">
              {/* Manual Adjustment Section */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
                  💰 Manual Adjustment
                </h4>
                <div className="space-y-3">
                  <input
                    type="number"
                    placeholder="Amount (+ or -)"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Reason (e.g. Compensation, Penalty)"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <button
                    onClick={submitAdjustment}
                    disabled={adjusting}
                    className="w-full py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-black transition-all"
                  >
                    {adjusting ? 'Processing...' : 'Execute Adjustment'}
                  </button>
                </div>
              </div>

              {/* Individual Overrides */}
              <div className="space-y-4 opacity-75">
                <h4 className="font-bold text-sm text-gray-700">Individual Overrides</h4>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Commission</label>
                  <input
                    type="number"
                    value={financialForm.base_commission_per_order}
                    onChange={(e) => setFinancialForm({...financialForm, base_commission_per_order: Number(e.target.value)})}
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Target</label>
                  <input
                    type="number"
                    value={financialForm.bonus_threshold}
                    onChange={(e) => setFinancialForm({...financialForm, bonus_threshold: Number(e.target.value)})}
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <button
                onClick={saveFinancialSettings}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
