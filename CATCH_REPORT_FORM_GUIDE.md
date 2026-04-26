# Catch Report Form - Dual Mode Implementation

## Overview

A refactored catch report form supporting two distinct modes: **Manual Entry** and **AI-Powered Voice Assistant**. Designed for bilingual fishermen to submit reports in under 1 minute.

## Component

**Location**: `components/catch-report-form.tsx`

## Features

### Mode Toggle
- **Tabs UI**: Clear switch between "Manual Entry" and "Voice Assistant"
- **Icons**: PenTool for manual, Mic for voice
- **State Management**: Seamless switching between modes

### Manual Entry Mode
Standard form with the following fields:
- **Species**: Dropdown (Bangus, Tilapia, Lapu-lapu, Dilis, Sardinas, Tuna, Taba, Bariles)
- **Weight (kg)**: Number input with decimal support
- **Processing Method**: Dropdown (Fresh, Smoked, Dried, Salted, Canned)
- **Location**: Dropdown (Banicain, Barretto, Kalaklan, Olongapo, Subic, Mariveles, Bataan)
- **Date**: Date picker (defaults to today)

### Voice Assistant Mode
- **Large Record Button**: Centered, accessible, with visual feedback
- **Real-time Status**: "Listening..." indicator with animation
- **Transcript Display**: Shows recognized speech
- **Auto-switch**: Automatically switches to Manual mode after transcription for review
- **Example Phrases**: Shows bilingual examples for guidance

### Offline STT
- **Web Speech API**: Uses browser's built-in speech recognition
- **Tagalog/English**: Configured for `tl-PH` (understands mixed speech)
- **Error Handling**: Graceful error messages for permission issues

### Auto-Fill Logic
- **Voice Parser**: Uses existing `parseTranscript` function
- **Automatic Population**: Fills all form fields from speech
- **Confidence Scoring**: Low confidence triggers suggestions
- **Bilingual Support**: Handles both Tagalog and English keywords

### Offline-First Sync
- **IndexedDB Storage**: Saves reports locally when offline
- **Connection Detection**: Monitors online/offline status
- **Auto-sync**: Triggers sync when connection restored
- **Pending Counter**: Shows number of unsynced reports
- **User Feedback**: Clear messages for offline save and sync status

## Usage

### Basic Implementation

```tsx
import { CatchReportForm } from '@/components/catch-report-form'

function MyPage() {
  const user = // your user object from Supabase auth
  
  return (
    <CatchReportForm 
      user={user}
      onSubmit={() => {
        // Handle successful submission
      }}
    />
  )
}
```

### Props

```typescript
interface CatchReportFormProps {
  user?: any           // Supabase user object
  onSubmit?: () => void // Callback after successful submission
}
```

## Voice Mode Workflow

1. User clicks "Voice Assistant" tab
2. User taps large record button
3. User speaks: *"Nakakuha ako ng limang kilong bangus sa Barretto, sariwa"*
4. Web Speech API transcribes the speech
5. Voice parser extracts structured data:
   - Species: bangus
   - Weight: 5.00 kg
   - Location: Barretto
   - Processing: fresh
6. Form auto-fills with extracted data
7. Automatically switches to Manual tab for review
8. User can edit if needed
9. User submits report

## Offline Workflow

1. User fills form (manual or voice)
2. User clicks submit
3. System detects offline status
4. Report saved to IndexedDB
5. Toast shows "Report Saved Offline"
6. Pending counter increments
7. When connection restored:
   - Auto-sync triggers
   - Reports sent to Supabase
   - IndexedDB cleared
   - Counter resets

## Bilingual Support

### Supported Phrases

**Tagalog**:
- "Nakakuha ako ng limang kilong bangus sa Barretto, sariwa"
- "May sampung kilong tilapia ako sa Banicain, tinapa"
- "Nahuli ko ang lapu-lapu sa Kalaklan, tuyo"

**English**:
- "I caught 5kg of bangus in Barretto, fresh"
- "I have 10kg of tilapia in Banicain, smoked"
- "I caught grouper in Kalaklan, dried"

### Keywords Recognized

**Species**: Bangus, Tilapia, Lapu-lapu, Dilis, Sardinas, Tuna, Taba, Bariles

**Processing**: Sariwa/Fresh, Tinapa/Smoked, Tuyo/Dried, Daing/Salted, Sardinas/Canned

**Locations**: Banicain, Barretto, Kalaklan, Olongapo, Subic, Mariveles, Bataan

**Weight**: Numeric values with "kilo" or "kg" suffix

## Integration with Existing Code

### Replacing Fisherman Dashboard Form

To use this component in the fisherman dashboard:

```tsx
// In components/fisherman-dashboard.tsx
import { CatchReportForm } from '@/components/catch-report-form'

// Replace the existing form section with:
{activeTab === 'new-report' && (
  <CatchReportForm 
    user={user}
    onSubmit={() => setActiveTab('my-reports')}
  />
)}
```

### Required Dependencies

The component uses existing utilities:
- `hooks/useSpeechToText` - Web Speech API hook
- `lib/voice-parser` - Transcript parsing
- `lib/offline-storage` - IndexedDB storage
- `lib/supabase` - Supabase client

## Customization

### Adding New Species

Edit the species dropdown in the component:

```tsx
<SelectContent>
  <SelectItem value="galunggong">Galunggong</SelectItem>
  {/* Add more species */}
</SelectContent>
```

### Changing Language

Modify the Web Speech API language:

```tsx
const { isListening, ... } = useSpeechToText({
  lang: 'en-US', // or 'fil-PH' for Filipino
  // ...
})
```

### Adjusting Sync Interval

The auto-sync triggers on connection restore. To add periodic sync:

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    if (isOnline) syncPendingReports()
  }, 60000) // Every minute
  
  return () => clearInterval(interval)
}, [isOnline])
```

## Testing

### Manual Mode Test
1. Select "Manual Entry" tab
2. Fill all fields
3. Click submit
4. Verify success message

### Voice Mode Test
1. Select "Voice Assistant" tab
2. Click record button
3. Speak a complete sentence
4. Verify transcript appears
5. Verify form auto-fills
6. Switch to Manual tab to review
7. Submit report

### Offline Test
1. Disconnect network (DevTools > Network > Offline)
2. Fill form (manual or voice)
3. Submit
4. Verify "Report Saved Offline" message
5. Check pending counter increments
6. Reconnect network
7. Verify auto-sync triggers
8. Check Supabase for data

## Browser Compatibility

| Feature | Chrome | Firefox | Safari |
|---------|--------|---------|--------|
| Manual Form | ✅ | ✅ | ✅ |
| Voice Mode | ✅ | ❌ | ⚠️ |
| Offline Storage | ✅ | ✅ | ✅ |
| Auto-sync | ✅ | ✅ | ✅ |

**Note**: Voice mode requires Chrome or Edge for Web Speech API support.

## Performance

- **Manual Mode**: Instant form entry
- **Voice Mode**: 1-3 seconds for transcription
- **Offline Save**: <100ms to IndexedDB
- **Auto-sync**: Depends on connection speed

## Security

- **Authentication**: Requires authenticated user
- **Data Validation**: All fields required before submission
- **Supabase RLS**: Applies to all submissions
- **Local Storage**: Data persists only on device

## Future Enhancements

1. **Voice Feedback**: Play back transcribed text for verification
2. **Photo Upload**: Add photo capture for catch verification
3. **GPS Location**: Auto-detect location from device GPS
4. **Batch Reports**: Submit multiple catches at once
5. **Voice Training**: Personalized accent adaptation
6. **Offline Analytics**: Show offline submission statistics

## Summary

The Catch Report Form provides:
- ✅ Clear mode toggle (Manual/Voice)
- ✅ Standard manual entry form
- ✅ Large accessible voice record button
- ✅ Web Speech API for offline STT
- ✅ Auto-fill from voice transcription
- ✅ IndexedDB offline storage
- ✅ Auto-sync on connection restore
- ✅ Bilingual Tagalog/English support
- ✅ Under 1-minute submission goal
- ✅ Production-ready error handling
