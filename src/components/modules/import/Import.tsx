// src/components/Import/Import.tsx
import React, { useEffect, useState, useRef, ChangeEvent } from 'react';

import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { useApp } from '../../../context/AppContext';
import { getSearchHash } from '../../../lib/navigationSearch';
// import { PaymentSummary } from './PaymentSummary';
// import { PaymentConfirmation } from './PaymentConfirmation';

export const Import: React.FC = () => {
  const { currentShop } = useApp();

  // ─── State for Tabs & Forms ──────────────────────────────────────────
  type TabId = 'create' | 'history' | 'analytics' | 'templates' | 'audience';
  type CampaignType = 'fastflash' | 'flashpro';
  type AudienceValue = 'all' | 'recent' | 'inactive' | 'vip' | 'segment' | 'manual';
  type ScheduleType = 'immediate' | 'scheduled' | 'optimal';

  const tabOptions: Array<{ id: TabId; label: string }> = [
    { id: 'create', label: 'Create' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'history', label: 'History' },
    { id: 'templates', label: 'Templates' },
    { id: 'audience', label: 'Audience' },
  ];

  const [activeTab, setActiveTab] = useState<TabId>('create');
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignType, setCampaignType] = useState<CampaignType>('fastflash');
  const [promotionName, setPromotionName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [audience, setAudience] = useState<AudienceValue>('all');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('immediate');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [template, setTemplate] = useState('');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const tabs: TabId[] = ['create', 'history', 'analytics', 'templates', 'audience'];
    const applySearchHash = () => {
      const hash = getSearchHash();
      const tab = hash.startsWith('import:') ? hash.split(':')[1] : '';
      if (tabs.includes(tab as TabId)) setActiveTab(tab as TabId);
    };

    applySearchHash();
    window.addEventListener('hashchange', applySearchHash);
    return () => window.removeEventListener('hashchange', applySearchHash);
  }, []);

  // For FlashPro (image+text)
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Channel selection (WhatsApp / Email / SMS)
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);
  const [sendEmail, setSendEmail] = useState<boolean>(false);
  const [sendSMS, setSendSMS] = useState<boolean>(false);

  // ─── Template and Audience Data ─────────────────────────────────────
  const templates = [
    { id: 'sale', name: 'Flash Sale', content: 'Flash Sale Alert! Get {discount}% OFF on all items. Valid until {date}. Shop now!', icon: '🔥' },
    { id: 'new', name: 'New Arrivals', content: 'New arrivals just landed! Check out our latest collection. Visit us today!', icon: '✨' },
    { id: 'clearance', name: 'Clearance', content: 'Mega Clearance Sale! Up to 70% OFF selected items. Limited time only!', icon: '💨' },
    { id: 'holiday', name: 'Holiday Special', content: 'Special holiday offer just for you! Enjoy exclusive discounts this season.', icon: '🎉' }
  ];

  const audienceOptions: ReadonlyArray<{
    value: AudienceValue;
    label: string;
    desc: string;
    count: string;
  }> = [
    { value: 'all', label: 'All Customers', desc: 'Send to entire customer base', count: '2,543' },
    { value: 'recent', label: 'Recent Buyers', desc: 'Customers who bought in last 30 days', count: '892' },
    { value: 'inactive', label: 'Inactive Customers', desc: 'No purchases in 60+ days', count: '1,234' },
    { value: 'vip', label: 'VIP Customers', desc: 'High-value customers', count: '156' },
    { value: 'segment', label: 'Custom Segment', desc: 'Create custom audience', count: '---' },
    { value: 'manual', label: 'Manual Selection', desc: 'Pick specific customers', count: '---' }
  ];

  const campaignStats = {
    total: 156,
    sent: 89,
    delivered: 85,
    opened: 64,
    clicked: 23,
    converted: 8
  };

  // ─── Handlers ───────────────────────────────────────────────────────
  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedImage(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setPromotionName('');
    setMessageContent('');
    setAudience('all');
    setScheduleDate('');
    setScheduleTime('');
    setUploadedImage(null);
    setSendWhatsApp(true);
    setSendEmail(false);
    setSendSMS(false);
    setTemplate('');
    setLanguage('en');
    setScheduleType('immediate');
    setCurrentStep(1);
  };

  const handleScheduleClick = () => {
    if (!currentShop) {
      alert('Please select a shop before creating a promotion.');
      return;
    }
    if (!sendWhatsApp && !sendEmail && !sendSMS) {
      alert('Please select at least one delivery channel.');
      return;
    }
    if (!promotionName.trim()) {
      alert('Please provide a promotion name.');
      return;
    }
    if (scheduleType === 'scheduled' && (!scheduleDate || !scheduleTime)) {
      alert('Please select both schedule date & time.');
      return;
    }

    // TODO: Integrate payment flow once backend is ready
  };

  const isAudienceValue = (value: string): value is AudienceValue =>
    audienceOptions.some((option) => option.value === value);

  const handleAudienceChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const { value } = event.target;
    if (isAudienceValue(value)) {
      setAudience(value);
    }
  };

  const isScheduleType = (value: string): value is ScheduleType =>
    value === 'immediate' || value === 'scheduled' || value === 'optimal';

  const handleScheduleTypeChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const { value } = event.target;
    if (isScheduleType(value)) {
      setScheduleType(value);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // ─── Step Progress Component ─────────────────────────────────────────
  const StepProgress = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        {[1, 2, 3, 4].map((step) => (
          <React.Fragment key={step}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm ${
              step <= currentStep 
                ? 'bg-[#c5f542] text-black' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              {step}
            </div>
            {step < 4 && (
              <div className={`w-12 h-1 rounded ${
                step < currentStep ? 'bg-[#c5f542]' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  // ─── Render Logic ────────────────────────────────────────────────────

  // Payment flows
  // if (paymentStep === 'payment' && lastPayload) {
  //   return (
  //     <PaymentSummary
  //       promotionName={lastPayload.promotionName}
  //       isFastFlash={lastPayload.isFastFlash}
  //       scheduleDate={lastPayload.scheduleDate}
  //       scheduleTime={lastPayload.scheduleTime}
  //       audience={lastPayload.audience}
  //       sendWhatsApp={lastPayload.sendWhatsApp}
  //       sendEmail={lastPayload.sendEmail}
  //       cost={lastPayload.cost}
  //       onPay={handlePay}
  //       onBack={() => setPaymentStep('form')}
  //     />
  //   );
  // }

  // if (paymentStep === 'confirmation' && lastPayload) {
  //   return (
  //     <PaymentConfirmation
  //       isFastFlash={lastPayload.isFastFlash}
  //       scheduleDate={lastPayload.scheduleDate}
  //       scheduleTime={lastPayload.scheduleTime}
  //       onNewPromotion={handleNewPromotion}
  //       onViewHistory={handleViewHistory}
  //     />
  //   );
  // }

  // Main interface
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="page-subheading">Create and manage promotional campaigns</p>
      </div>

      <div>
        <div className="module-tabs">
          {tabOptions.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`module-tab ${
                activeTab === tab.id
                  ? 'module-tab-active'
                  : ''
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div>
        {/* Campaign Creation */}
        {activeTab === 'create' && (
          <div className="space-y-8">
            <StepProgress />
            
            {/* Step 1: Campaign Type */}
            {currentStep === 1 && (
              <div className="rounded-2xl border border-[#e4e4e0] bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-black mb-2">Choose Your Campaign Type</h2>
                  <p className="text-black">Select the best format for your promotional message</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  <div
                    onClick={() => setCampaignType('fastflash')}
                    className={`group cursor-pointer p-8 rounded-2xl border-2 transition-all duration-300 ${
                      campaignType === 'fastflash'
                        ? 'border-[#c5f542] bg-[#c5f542]/10'
                        : 'border-[#eeeeeb] hover:border-[#c5f542]'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 ${
                        campaignType === 'fastflash' ? 'bg-[#c5f542] text-black' : 'bg-gray-100 text-gray-500 group-hover:bg-[#c5f542] group-hover:text-black'
                      } transition-all duration-300`}>
                        <span className="text-sm font-semibold">Fast</span>
                      </div>
                      <h3 className="text-xl font-bold text-black mb-2">FastFlash</h3>
                      <p className="text-black mb-4">Quick text-only messages for instant customer engagement</p>
                      <div className="inline-flex items-center space-x-2 text-verde-primary font-semibold">
                        <span className="text-2xl">₹100</span>
                        <span className="text-sm text-gray-500">per campaign</span>
                      </div>
                      {campaignType === 'fastflash' && (
                        <div className="mt-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-verde-primary text-white">
                            Popular Choice
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    onClick={() => setCampaignType('flashpro')}
                    className={`group cursor-pointer p-8 rounded-2xl border-2 transition-all duration-300 ${
                      campaignType === 'flashpro'
                        ? 'border-[#c5f542] bg-[#c5f542]/10'
                        : 'border-[#eeeeeb] hover:border-[#c5f542]'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 ${
                        campaignType === 'flashpro' ? 'bg-[#c5f542] text-black' : 'bg-gray-100 text-gray-500 group-hover:bg-[#c5f542] group-hover:text-black'
                      } transition-all duration-300`}>
                        <span className="text-sm font-semibold">Pro</span>
                      </div>
                      <h3 className="text-xl font-bold text-black mb-2">FlashPro</h3>
                      <p className="text-black mb-4">Rich media campaigns with images and advanced features</p>
                      <div className="inline-flex items-center space-x-2 text-verde-primary font-semibold">
                        <span className="text-2xl">₹250</span>
                        <span className="text-sm text-gray-500">per campaign</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8">
                  <Button variant="primary" onClick={nextStep} className="px-8">
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Content Creation */}
            {currentStep === 2 && (
              <div className="rounded-2xl border border-[#e4e4e0] bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-black mb-2">Create Your Message</h2>
                  <p className="text-black">Craft compelling content that drives action</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {/* Campaign Name */}
                    <div>
                      <label className="block text-sm font-semibold text-black mb-3">Campaign Name</label>
                      <Input
                        placeholder="e.g. Weekend Flash Sale"
                        value={promotionName}
                        onChange={(e) => setPromotionName(e.target.value)}
                        className="text-lg"
                      />
                    </div>

                    {/* Templates */}
                    <div>
                      <label className="block text-sm font-semibold text-black mb-3">Quick Templates</label>
                      <div className="grid grid-cols-2 gap-3">
                        {templates.map(tmpl => (
                          <button
                            key={tmpl.id}
                            onClick={() => {
                              setTemplate(tmpl.id);
                              setMessageContent(tmpl.content);
                            }}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              template === tmpl.id
                                ? 'border-verde-primary bg-verde-primary/5'
                                : 'border-gray-200 hover:border-verde-primary/50'
                            }`}
                          >
                            <div className="font-medium text-black">{tmpl.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message Content */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-semibold text-black">Message Content</label>
                        <div className="flex space-x-2">
                          <button className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full hover:bg-yellow-200 transition-colors">
                            Discount
                          </button>
                          <button className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 transition-colors">
                            QR Code
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder="Enter your promotional message..."
                        rows={6}
                        maxLength={campaignType === 'fastflash' ? 160 : 500}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-verde-primary focus:border-verde-primary resize-none"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-500">
                          {messageContent.length}/{campaignType === 'fastflash' ? 160 : 500} characters
                        </span>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-verde-primary focus:border-verde-primary"
                        >
                          <option value="en">English</option>
                          <option value="si">සිංහල</option>
                          <option value="ta">தமிழ்</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Image Upload for FlashPro */}
                    {campaignType === 'flashpro' && (
                      <div>
                        <label className="block text-sm font-semibold text-black mb-3">Campaign Image</label>
                        <div
                          onClick={() => imageInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-verde-primary transition-colors bg-gradient-to-br from-gray-50 to-white"
                        >
                          {uploadedImage ? (
                            <div className="space-y-4">
                              <img
                                src={URL.createObjectURL(uploadedImage)}
                                alt="Preview"
                                className="mx-auto h-40 w-40 object-cover rounded-xl shadow-lg"
                              />
                              <p className="text-sm text-gray-600">Click to change image</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div>
                                <p className="text-lg font-medium text-black">Upload Campaign Image</p>
                                <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </div>
                    )}

                    {/* Preview */}
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border">
                      <h3 className="font-semibold text-black mb-3">Message Preview</h3>
                      <div className="bg-white rounded-xl p-4 shadow-sm border space-y-3">
                        {uploadedImage && (
                          <img src={URL.createObjectURL(uploadedImage)} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                        )}
                        <div className="text-sm text-black">{messageContent || 'Your message will appear here...'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button variant="primary" onClick={nextStep}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Audience & Channels */}
            {currentStep === 3 && (
              <div className="rounded-2xl border border-[#e4e4e0] bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-black mb-2">Target Your Audience</h2>
                  <p className="text-black">Choose who receives your campaign and how</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Audience Selection */}
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-4">Select Audience</h3>
                    <div className="space-y-3">
                      {audienceOptions.map(option => {
                        return (
                          <label key={option.value} className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            audience === option.value
                              ? 'border-verde-primary bg-verde-primary/5'
                              : 'border-gray-200 hover:border-verde-primary/50'
                          }`}>
                            <input
                              type="radio"
                              name="audience"
                              value={option.value}
                              checked={audience === option.value}
                              onChange={handleAudienceChange}
                              className="sr-only"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-black">{option.label}</div>
                                <div className="text-sm font-semibold text-verde-primary">{option.count}</div>
                              </div>
                              <div className="text-sm text-gray-500">{option.desc}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery Channels */}
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-4">Delivery Channels</h3>
                    <div className="space-y-3">
                      <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        sendWhatsApp ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="checkbox"
                          checked={sendWhatsApp}
                          onChange={(e) => setSendWhatsApp(e.target.checked)}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-black">WhatsApp Business</div>
                          <div className="text-sm text-gray-500">High engagement rate • 95% open rate</div>
                        </div>
                        {sendWhatsApp && <span className="text-xs font-semibold text-[#555550]">Selected</span>}
                      </label>

                      <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        sendEmail ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="checkbox"
                          checked={sendEmail}
                          onChange={(e) => setSendEmail(e.target.checked)}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-black">Email</div>
                          <div className="text-sm text-gray-500">Rich content support • 78% open rate</div>
                        </div>
                        {sendEmail && <span className="text-xs font-semibold text-[#555550]">Selected</span>}
                      </label>

                      <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        sendSMS ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="checkbox"
                          checked={sendSMS}
                          onChange={(e) => setSendSMS(e.target.checked)}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-black">SMS</div>
                          <div className="text-sm text-gray-500">Universal delivery • 98% delivery rate</div>
                        </div>
                        {sendSMS && <span className="text-xs font-semibold text-[#555550]">Selected</span>}
                      </label>
                    </div>

                    {/* Estimated Reach */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-verde-primary/10 to-green-100 rounded-xl border border-verde-primary/20">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-verde-primary">Estimated Reach</span>
                      </div>
                      <div className="text-2xl font-bold text-black">
                        {audienceOptions.find(opt => opt.value === audience)?.count || '0'} customers
                      </div>
                      <div className="text-sm text-gray-600">
                        Expected engagement: 65-80%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button variant="primary" onClick={nextStep}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Schedule & Launch */}
            {currentStep === 4 && (
              <div className="rounded-2xl border border-[#e4e4e0] bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-black mb-2">Schedule Your Campaign</h2>
                  <p className="text-black">Choose when to send your promotional message</p>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Scheduling Options */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className={`p-6 rounded-xl border-2 cursor-pointer text-center transition-all ${
                      scheduleType === 'immediate'
                        ? 'border-verde-primary bg-verde-primary/5'
                        : 'border-gray-200 hover:border-verde-primary/50'
                    }`}>
                      <input
                        type="radio"
                        name="schedule"
                        value="immediate"
                        checked={scheduleType === 'immediate'}
                        onChange={handleScheduleTypeChange}
                        className="sr-only"
                      />
                      <div className="font-semibold text-black">Send Now</div>
                      <div className="text-sm text-gray-500 mt-1">Immediate delivery</div>
                    </label>

                    <label className={`p-6 rounded-xl border-2 cursor-pointer text-center transition-all ${
                      scheduleType === 'scheduled'
                        ? 'border-verde-primary bg-verde-primary/5'
                        : 'border-gray-200 hover:border-verde-primary/50'
                    }`}>
                      <input
                        type="radio"
                        name="schedule"
                        value="scheduled"
                        checked={scheduleType === 'scheduled'}
                        onChange={handleScheduleTypeChange}
                        className="sr-only"
                      />
                      <div className="font-semibold text-black">Schedule</div>
                      <div className="text-sm text-gray-500 mt-1">Pick date & time</div>
                    </label>

                    <label className={`p-6 rounded-xl border-2 cursor-pointer text-center transition-all ${
                      scheduleType === 'optimal'
                        ? 'border-verde-primary bg-verde-primary/5'
                        : 'border-gray-200 hover:border-verde-primary/50'
                    }`}>
                      <input
                        type="radio"
                        name="schedule"
                        value="optimal"
                        checked={scheduleType === 'optimal'}
                        onChange={handleScheduleTypeChange}
                        className="sr-only"
                      />
                      <div className="font-semibold text-black">Best Time</div>
                      <div className="text-sm text-gray-500 mt-1">AI-optimized timing</div>
                    </label>
                  </div>

                  {/* Date/Time Selection */}
                  {scheduleType === 'scheduled' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-gray-50 rounded-xl">
                      <div>
                        <label className="block text-sm font-semibold text-black mb-2">Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-verde-primary focus:border-verde-primary"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-black mb-2">Time</label>
                        <div className="relative">
                          <input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-verde-primary focus:border-verde-primary"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campaign Summary */}
                  <div className="p-6 bg-gradient-to-r from-verde-primary/10 to-green-100 rounded-xl border border-verde-primary/20">
                    <h3 className="font-semibold text-black mb-4">Campaign Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Campaign Type</div>
                        <div className="font-semibold text-black">{campaignType === 'fastflash' ? 'FastFlash' : 'FlashPro'}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Audience</div>
                        <div className="font-semibold text-black">
                          {audienceOptions.find(opt => opt.value === audience)?.label}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Channels</div>
                        <div className="font-semibold text-black">
                          {[sendWhatsApp && 'WhatsApp', sendEmail && 'Email', sendSMS && 'SMS'].filter(Boolean).join(', ')}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Cost</div>
                        <div className="font-semibold text-verde-primary text-lg">₹{campaignType === 'fastflash' ? 100 : 250}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <div className="flex space-x-3">
                    <Button variant="outline" onClick={resetForm}>
                      Save Draft
                    </Button>
                    <Button variant="primary" onClick={handleScheduleClick} className="px-8">
                      {scheduleType === 'immediate' ? 'Launch Campaign' : 'Schedule Campaign'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Total', value: campaignStats.total, color: 'gray' },
                { label: 'Sent', value: campaignStats.sent, color: 'verde' },
                { label: 'Delivered', value: campaignStats.delivered, color: 'blue' },
                { label: 'Opened', value: campaignStats.opened, color: 'purple' },
                { label: 'Clicked', value: campaignStats.clicked, color: 'orange' },
                { label: 'Converted', value: campaignStats.converted, color: 'red' }
              ].map((stat, index) => (
                <div key={index} className="bg-white p-3 rounded-lg shadow-sm border">
                  <div className={`text-xl font-bold ${stat.color === 'verde' ? 'text-verde-primary' : `text-${stat.color}-600`} mb-1`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h2 className="text-base font-bold text-black mb-4">Performance Overview</h2>
              <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Charts display here</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b bg-verde-primary/5">
              <h2 className="text-base font-bold text-black">Campaign History</h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-black text-sm">Weekend Flash Sale</div>
                      <div className="text-xs text-gray-500">Sep 8, 2025 • 09:00 AM</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-black">₹100</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-verde-primary/10 text-verde-primary">
                        Sent
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      FastFlash
                    </span>
                    <div className="text-xs text-verde-primary font-medium">85% delivered</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs */}
        {(activeTab === 'templates' || activeTab === 'audience') && (
          <div className="text-center py-12">
            <h3 className="text-base font-semibold text-black mb-2">
              {activeTab === 'templates' ? 'Templates Library' : 'Audience Management'}
            </h3>
            <p className="text-sm text-gray-600">
              {activeTab === 'templates' ? 'Manage templates' : 'Manage audiences'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
