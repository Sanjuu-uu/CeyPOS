// src/components/Import/Import.tsx
import React, { useState, useRef, ChangeEvent } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import {
  Zap,
  Image as ImageIcon,
  Calendar,
  Clock,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const Import: React.FC = () => {
  const { currentShop } = useApp();

  // === State for FlashPromo ===
  const [activeTab, setActiveTab] = useState<'fastflash' | 'imgtext'>('fastflash');
  const [promotionName, setPromotionName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [audience, setAudience] = useState<'all' | 'segment'>('all');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');

  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Handle change of the image file input
  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedImage(e.target.files[0]);
    }
  };

  // Reset the entire form
  const resetForm = () => {
    setPromotionName('');
    setMessageContent('');
    setAudience('all');
    setScheduleDate('');
    setScheduleTime('');
    setUploadedImage(null);
  };

  // Dummy submit handler; replace with real API call
  const handleSubmit = () => {
    if (!currentShop) {
      alert('Please select a shop before creating a promotion.');
      return;
    }

    const payload: any = {
      type: activeTab === 'fastflash' ? 'text' : 'image+text',
      promotionName,
      messageContent,
      audience,
      schedule: `${scheduleDate} ${scheduleTime}`,
    };
    if (activeTab === 'imgtext' && uploadedImage) {
      payload.image = uploadedImage;
    }

    console.log('FlashPromo payload →', payload);
    alert('🎉 Promotion scheduled successfully!');
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">FlashPromo</h1>
        {/* You can uncomment this if you build a history page later */}
        {/* <Button variant="outline">Promotion History</Button> */}
      </div>

      {/* ===== Tab Navigation ===== */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('fastflash')}
            className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'fastflash'
                ? 'border-verde-primary text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Zap size={16} />
            <span>FastFlash</span>
          </button>

          <button
            onClick={() => setActiveTab('imgtext')}
            className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'imgtext'
                ? 'border-verde-primary text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ImageIcon size={16} />
            <span>Image+Text Promo</span>
          </button>
        </nav>
      </div>

      {/* ===== FastFlash (Text-Only) Form ===== */}
      {activeTab === 'fastflash' && (
        <Card title="Create New FastFlash (Text-Only)" className="border border-gray-100">
          <div className="space-y-6">
            {/* Promotion Name */}
            <div>
              <label htmlFor="promo-name-text" className="block text-sm font-medium text-gray-700">
                Promotion Name
              </label>
              <Input
                id="promo-name-text"
                placeholder="e.g. Weekend Mega Sale"
                value={promotionName}
                onChange={(e) => setPromotionName(e.target.value)}
              />
            </div>

            {/* Message Content */}
            <div>
              <label htmlFor="promo-message-text" className="block text-sm font-medium text-gray-700">
                Message Content (max 160 chars)
              </label>
              <textarea
                id="promo-message-text"
                rows={3}
                maxLength={160}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-verde-primary focus:ring-verde-primary sm:text-sm"
                placeholder="Enter your text-only message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">{messageContent.length}/160 chars used</p>
            </div>

            {/* Audience Selector */}
            <div>
              <label htmlFor="audience-text" className="block text-sm font-medium text-gray-700">
                Target Audience
              </label>
              <select
                id="audience-text"
                className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-verde-primary focus:outline-none focus:ring-verde-primary sm:text-sm"
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
                <label htmlFor="schedule-date-text" className="block text-sm font-medium text-gray-700">
                  Schedule Date
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Calendar size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="schedule-date-text"
                    type="date"
                    className="block w-full rounded-md border-gray-300 py-2 pl-10 pr-3 focus:border-verde-primary focus:outline-none focus:ring-verde-primary sm:text-sm"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="schedule-time-text" className="block text-sm font-medium text-gray-700">
                  Schedule Time
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Clock size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="schedule-time-text"
                    type="time"
                    className="block w-full rounded-md border-gray-300 py-2 pl-10 pr-3 focus:border-verde-primary focus:outline-none focus:ring-verde-primary sm:text-sm"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={resetForm}>
                Reset
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                Schedule FastFlash
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ===== Image+Text Promo Form ===== */}
      {activeTab === 'imgtext' && (
        <Card title="Create New Image+Text Promo" className="border border-gray-100">
          <div className="space-y-6">
            {/* Promotion Name */}
            <div>
              <label htmlFor="promo-name-img" className="block text-sm font-medium text-gray-700">
                Promotion Name
              </label>
              <Input
                id="promo-name-img"
                placeholder="e.g. Summer Collection Flyer"
                value={promotionName}
                onChange={(e) => setPromotionName(e.target.value)}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Upload Flyer Image</label>
              <div
                className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6"
                onClick={() => imageInputRef.current?.click()}
              >
                <div className="space-y-1 text-center">
                  {uploadedImage ? (
                    <img
                      src={URL.createObjectURL(uploadedImage)}
                      alt="Preview"
                      className="mx-auto h-32 w-32 rounded"
                    />
                  ) : (
                    <ImageIcon size={32} className="text-gray-400 mx-auto" />
                  )}
                  <div className="flex text-sm text-gray-600">
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

            {/* Message Content */}
            <div>
              <label htmlFor="promo-message-img" className="block text-sm font-medium text-gray-700">
                Caption / Message Content (optional, max 250 chars)
              </label>
              <textarea
                id="promo-message-img"
                rows={3}
                maxLength={250}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-verde-primary focus:ring-verde-primary sm:text-sm"
                placeholder="Add a caption or brief message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">{messageContent.length}/250 chars used</p>
            </div>

            {/* Audience Selector */}
            <div>
              <label htmlFor="audience-img" className="block text-sm font-medium text-gray-700">
                Target Audience
              </label>
              <select
                id="audience-img"
                className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-verde-primary focus:outline-none focus:ring-verde-primary sm:text-sm"
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
                <label htmlFor="schedule-date-img" className="block text-sm font-medium text-gray-700">
                  Schedule Date
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Calendar size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="schedule-date-img"
                    type="date"
                    className="block w-full rounded-md border-gray-300 py-2 pl-10 pr-3 focus:border-verde-primary focus:outline-none focus:ring-verde-primary sm:text-sm"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="schedule-time-img" className="block text-sm font-medium text-gray-700">
                  Schedule Time
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Clock size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="schedule-time-img"
                    type="time"
                    className="block w-full rounded-md border-gray-300 py-2 pl-10 pr-3 focus:border-verde-primary focus:outline-none focus:ring-verde-primary sm:text-sm"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={resetForm}>
                Reset
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                Schedule Image+Text Promo
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
