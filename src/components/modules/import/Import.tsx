// src/components/Import/Import.tsx
import React, { useState, useRef, ChangeEvent } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Zap, Image as ImageIcon, Calendar, Clock, List } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

import { PaymentSummary } from './PaymentSummary';
import { PaymentConfirmation } from './PaymentConfirmation';

export const Import: React.FC = () => {
  const { currentShop } = useApp();

  // ─── State for Tabs & Forms ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'fastflash' | 'flashpro' | 'history'>('fastflash');
  const [promotionName, setPromotionName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [audience, setAudience] = useState<'all' | 'segment'>('all');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');

  // For FlashPro (image+text)
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Channel selection (WhatsApp / Email)
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(false);
  const [sendEmail, setSendEmail] = useState<boolean>(false);

  // ─── State for Payment Flow ─────────────────────────────────────────
  const [paymentStep, setPaymentStep] = useState<'form' | 'payment' | 'confirmation'>('form');
  type Payload = {
    isFastFlash: boolean;
    promotionName: string;
    scheduleDate: string;
    scheduleTime: string;
    audience: 'all' | 'segment';
    sendWhatsApp: boolean;
    sendEmail: boolean;
    cost: number;
  };
  const [lastPayload, setLastPayload] = useState<Payload | null>(null);

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
    setSendWhatsApp(false);
    setSendEmail(false);
    setPaymentStep('form');
    setLastPayload(null);
  };

  const handleScheduleClick = () => {
    if (!currentShop) {
      alert('Please select a shop before creating a promotion.');
      return;
    }
    if (!sendWhatsApp && !sendEmail) {
      alert('Please select at least WhatsApp or Email.');
      return;
    }
    if (!promotionName.trim()) {
      alert('Please provide a promotion name.');
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      alert('Please select both schedule date & time.');
      return;
    }

    const payload: Payload = {
      isFastFlash: activeTab === 'fastflash',
      promotionName,
      scheduleDate,
      scheduleTime,
      audience,
      sendWhatsApp,
      sendEmail,
      cost: activeTab === 'fastflash' ? 100 : 250,
    };

    setLastPayload(payload);
    setPaymentStep('payment');
  };

  const handlePay = () => {
    // Simulate a short payment‐gateway call
    setTimeout(() => {
      setPaymentStep('confirmation');
    }, 500);
  };

  const handleNewPromotion = () => {
    resetForm();
    setActiveTab('fastflash');
  };

  const handleViewHistory = () => {
    setActiveTab('history');
    setPaymentStep('form');
  };

  // ─── Render Logic ────────────────────────────────────────────────────

  // 1) Show PaymentSummary if in 'payment'
  if (paymentStep === 'payment' && lastPayload) {
    return (
      <PaymentSummary
        promotionName={lastPayload.promotionName}
        isFastFlash={lastPayload.isFastFlash}
        scheduleDate={lastPayload.scheduleDate}
        scheduleTime={lastPayload.scheduleTime}
        audience={lastPayload.audience}
        sendWhatsApp={lastPayload.sendWhatsApp}
        sendEmail={lastPayload.sendEmail}
        cost={lastPayload.cost}
        onPay={handlePay}
        onBack={() => setPaymentStep('form')}
      />
    );
  }

  // 2) Show PaymentConfirmation if in 'confirmation'
  if (paymentStep === 'confirmation' && lastPayload) {
    return (
      <PaymentConfirmation
        isFastFlash={lastPayload.isFastFlash}
        scheduleDate={lastPayload.scheduleDate}
        scheduleTime={lastPayload.scheduleTime}
        onNewPromotion={handleNewPromotion}
        onViewHistory={handleViewHistory}
      />
    );
  }

  // 3) Otherwise, show the main “FlashPromo” tabs + forms
  return (
    <div className="bg-gray-50 min-h-screen px-6 py-8">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">FlashPromo</h1>

      {/* ─── Tabs ──────────────────────────────────────────────────────── */}
      <nav className="flex space-x-6 border-b border-gray-200 pb-2 mb-8">
        <button
          onClick={() => {
            setActiveTab('fastflash');
            resetForm();
          }}
          className={`flex items-center space-x-1 text-sm font-medium pb-1 ${
            activeTab === 'fastflash'
              ? 'border-b-2 border-verde-primary text-gray-900'
              : 'border-b-2 border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <Zap size={16} />
          <span>FastFlash</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('flashpro');
            resetForm();
          }}
          className={`flex items-center space-x-1 text-sm font-medium pb-1 ${
            activeTab === 'flashpro'
              ? 'border-b-2 border-verde-primary text-gray-900'
              : 'border-b-2 border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <ImageIcon size={16} />
          <span>FlashPro</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            resetForm();
          }}
          className={`flex items-center space-x-1 text-sm font-medium pb-1 ${
            activeTab === 'history'
              ? 'border-b-2 border-verde-primary text-gray-900'
              : 'border-b-2 border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <List size={16} />
          <span>History</span>
        </button>
      </nav>

      {/* ─── FastFlash Form ─────────────────────────────────────────────── */}
      {activeTab === 'fastflash' && (
        <Card className="w-full shadow-lg rounded-xl overflow-hidden">
          {/* Card Header */}
          <div className="bg-gray-100 px-6 py-4 flex items-center space-x-2">
            <Zap size={20} className="text-verde-primary" />
            <h2 className="text-lg font-semibold text-gray-800">Create New FastFlash (Text-Only)</h2>
          </div>

          {/* Card Body */}
          <div className="p-6 space-y-6">
            {/* Promotion Name */}
            <div>
              <label htmlFor="promo-name-fastflash" className="block text-sm font-medium text-gray-700">
                Promotion Name
              </label>
              <Input
                id="promo-name-fastflash"
                placeholder="e.g. Weekend Mega Sale"
                value={promotionName}
                onChange={(e) => setPromotionName(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Message Content */}
            <div>
              <label htmlFor="promo-message-fastflash" className="block text-sm font-medium text-gray-700">
                Message Content (max 160 chars)
              </label>
              <textarea
                id="promo-message-fastflash"
                rows={3}
                maxLength={160}
                className="
                  mt-2 block w-full rounded-md border-gray-300 shadow-sm
                  focus:border-verde-primary focus:ring-verde-primary sm:text-sm
                  px-4 py-2 break-words
                "
                placeholder="Enter your text-only message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">{messageContent.length}/160 chars used</p>
            </div>

            {/* Audience Selector */}
            <div>
              <label htmlFor="audience-fastflash" className="block text-sm font-medium text-gray-700">
                Target Audience
              </label>
              <select
                id="audience-fastflash"
                className="
                  mt-2 block w-full rounded-md border-gray-300 bg-white px-3 py-2 shadow-sm
                  focus:border-verde-primary focus:outline-none focus:ring-verde-primary sm:text-sm
                "
                value={audience}
                onChange={(e) => setAudience(e.target.value as 'all' | 'segment')}
              >
                <option value="all">All Customers</option>
                <option value="segment">Customer Segment</option>
              </select>
            </div>

            {/* Schedule Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="schedule-date-fastflash" className="block text-sm font-medium text-gray-700">
                  Schedule Date
                </label>
                <div className="relative mt-2 shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Calendar size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="schedule-date-fastflash"
                    type="date"
                    className="
                      block w-full rounded-md border-gray-300 py-2 pl-10 pr-3
                      focus:border-verde-primary focus:outline-none focus:ring-verde-primary sm:text-sm
                    "
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="schedule-time-fastflash" className="block text-sm font-medium text-gray-700">
                  Schedule Time
                </label>
                <div className="relative mt-2 shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Clock size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="schedule-time-fastflash"
                    type="time"
                    className="
                      block w-full rounded-md border-gray-300 py-2 pl-10 pr-3
                      focus:border-verde-primary focus:outline-none focus:ring-verde-primary sm:text-sm
                    "
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Channel Selection */}
            <div className="flex flex-wrap gap-6">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={(e) => setSendWhatsApp(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-green-500"
                />
                <span className="ml-2 text-sm text-gray-700">Send via WhatsApp</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Send via Email</span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={resetForm}>
                Reset
              </Button>
              <Button variant="primary" onClick={handleScheduleClick}>
                Schedule FastFlash
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ─── FlashPro Form ───────────────────────────────────────────────── */}
      {activeTab === 'flashpro' && (
        <Card className="w-full shadow-lg rounded-xl overflow-hidden">
          {/* Card Header */}
          <div className="bg-gray-100 px-6 py-4 flex items-center space-x-2">
            <ImageIcon size={20} className="text-verde-primary" />
            <h2 className="text-lg font-semibold text-gray-800">Create New FlashPro (Image+Text)</h2>
          </div>

          {/* Card Body */}
          <div className="p-6 space-y-6">
            {/* Promotion Name */}
            <div>
              <label htmlFor="promo-name-flashpro" className="block text-sm font-medium text-gray-700">
                Promotion Name
              </label>
              <Input
                id="promo-name-flashpro"
                placeholder="e.g. Summer Collection Flyer"
                value={promotionName}
                onChange={(e) => setPromotionName(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Upload Flyer Image</label>
              <div
                className="mt-2 flex justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 hover:border-gray-400 cursor-pointer"
                onClick={() => imageInputRef.current?.click()}
              >
                <div className="space-y-2 text-center">
                  {uploadedImage ? (
                    <img
                      src={URL.createObjectURL(uploadedImage)}
                      alt="Preview"
                      className="mx-auto h-32 w-32 rounded-lg object-cover"
                    />
                  ) : (
                    <ImageIcon size={36} className="text-gray-400 mx-auto" />
                  )}
                  <div className="flex justify-center">
                    <Button variant="outline" onClick={() => imageInputRef.current?.click()}>
                      {uploadedImage ? 'Replace Image' : 'Click to Upload'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
                </div>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png, image/jpeg"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>

            {/* Caption / Message Content */}
            <div>
              <label htmlFor="promo-message-flashpro" className="block text-sm font-medium text-gray-700">
                Caption / Message Content (optional, max 250 chars)
              </label>
              <textarea
                id="promo-message-flashpro"
                rows={3}
                maxLength={250}
                className="
                  mt-2 block w-full rounded-md border-gray-300 shadow-sm
                  focus:border-verde-primary focus:ring-verde-primary sm:text-sm
                  px-4 py-2 break-words
                "
                placeholder="Add a caption or brief message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">{messageContent.length}/250 chars used</p>
            </div>

            {/* Target Audience */}
            <div>
              <label htmlFor="audience-flashpro" className="block text-sm font-medium text-gray-700">
                Target Audience
              </label>
              <select
                id="audience-flashpro"
                className="
                  mt-2 block w-full rounded-md border-gray-300 bg-white px-3 py-2 shadow-sm
                  focus:border-verde-primary focus:outline-none focus:ring-verde-primary sm:text-sm
                "
                value={audience}
                onChange={(e) => setAudience(e.target.value as 'all' | 'segment')}
              >
                <option value="all">All Customers</option>
                <option value="segment">Customer Segment</option>
              </select>
            </div>

            {/* Schedule Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="schedule-date-flashpro" className="block text-sm font-medium text-gray-700">
                  Schedule Date
                </label>
                <div className="relative mt-2 shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Calendar size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="schedule-date-flashpro"
                    type="date"
                    className="
                      block w-full rounded-md border-gray-300 py-2 pl-10 pr-3
                      focus:border-verde-primary focus:outline-none focus:ring-verde-primary sm:text-sm
                    "
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="schedule-time-flashpro" className="block text-sm font-medium text-gray-700">
                  Schedule Time
                </label>
                <div className="relative mt-2 shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Clock size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="schedule-time-flashpro"
                    type="time"
                    className="
                      block w-full rounded-md border-gray-300 py-2 pl-10 pr-3
                      focus:border-verde-primary focus:outline-none focus:ring-verde-primary sm:text-sm
                    "
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Channel Selection */}
            <div className="flex flex-wrap gap-6">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={(e) => setSendWhatsApp(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-green-500"
                />
                <span className="ml-2 text-sm text-gray-700">Send via WhatsApp</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Send via Email</span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={resetForm}>
                Reset
              </Button>
              <Button variant="primary" onClick={handleScheduleClick}>
                Schedule FlashPro
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ─── History Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <Card className="w-full shadow-lg rounded-xl overflow-hidden">
          <div className="bg-gray-100 px-6 py-4 flex items-center space-x-2">
            <List size={20} className="text-verde-primary" />
            <h2 className="text-lg font-semibold text-gray-800">Promotion History</h2>
          </div>
          <div className="p-6 bg-white overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 table-auto text-gray-700">
              {/* Table Header */}
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="hidden sm:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheduled At
                  </th>
                  <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Audience
                  </th>
                  <th className="hidden lg:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost (₹)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm break-words">PF-001</td>
                  <td className="px-4 py-3 text-sm break-words">FastFlash</td>
                  <td className="px-4 py-3 text-sm break-words">Weekend Mega Sale</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-sm break-words">2025-05-30 09:00 AM</td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm break-words">All Customers</td>
                  <td className="hidden lg:table-cell px-4 py-3 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Sent
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right break-words">100</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm break-words">PP-002</td>
                  <td className="px-4 py-3 text-sm break-words">FlashPro</td>
                  <td className="px-4 py-3 text-sm break-words">Summer Collection Flyer</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-sm break-words">2025-06-02 02:00 PM</td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm break-words">VIP Customers</td>
                  <td className="hidden lg:table-cell px-4 py-3 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Scheduled
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right break-words">250</td>
                </tr>
                {/* If no promotions: */}
                {/* <tr>
                  <td colSpan={7} className="px-4 py-3 text-center text-sm text-gray-500">
                    No promotions found.
                  </td>
                </tr> */}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
