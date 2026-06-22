'use client'

import Link from 'next/link'
import { Send, RotateCcw, ArrowLeft } from 'lucide-react'

export default function NewCampaignPage() {
  return (
    <div className="max-w-xl mx-auto mt-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/campaigns" className="text-gray-400 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Create a Campaign</h1>
          <p className="text-sm text-gray-500 mt-0.5">Choose the type of campaign you want to create.</p>
        </div>
      </div>

      <div className="space-y-4">
        <Link href="/campaigns/create">
          <div className="p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Send className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base">One-time Campaign</p>
                <p className="text-sm text-gray-500 mt-1">
                  Send an email to your list once — a newsletter, announcement, or promotion.
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/recurring-campaigns/new">
          <div className="p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <RotateCcw className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base">Recurring Campaign</p>
                <p className="text-sm text-gray-500 mt-1">
                  Automatically send on a schedule — daily, weekly, or monthly — with rotating templates.
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
