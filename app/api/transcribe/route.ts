import { NextRequest, NextResponse } from 'next/server'

/**
 * OpenAI Whisper API Route
 * Transcribes audio files using OpenAI's Whisper model
 * 
 * POST /api/transcribe
 * Body: { audio: base64-encoded audio string }
 * Returns: { transcript: string }
 */

export async function POST(request: NextRequest) {
  try {
    const { audio } = await request.json()

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio data is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      )
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64')

    // Create a File object for the API
    const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' })

    // Create FormData for OpenAI API
    const formData = new FormData()
    formData.append('file', audioFile)
    formData.append('model', 'whisper-1')
    formData.append('language', 'tl') // Tagalog
    formData.append('response_format', 'json')

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI API error:', error)
      return NextResponse.json(
        { error: 'Failed to transcribe audio', details: error },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      transcript: data.text,
      duration: data.duration
    })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Internal server error during transcription' },
      { status: 500 }
    )
  }
}

// Configure route to handle larger file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
