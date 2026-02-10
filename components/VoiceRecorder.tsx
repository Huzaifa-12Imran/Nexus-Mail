'use client';

import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Mail, FileText, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface VoiceRecorderProps {
    onComplete?: (transcript: string, emailDraft: string) => void;
    onCancel?: () => void;
}

export default function VoiceRecorder({ onComplete, onCancel }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [emailDraft, setEmailDraft] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [useTextMode, setUseTextMode] = useState(false);
    const [textInput, setTextInput] = useState('');
    const recognitionRef = useRef<any>(null);
    const finalTranscriptRef = useRef<string>('');

    const startRecording = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            setError('Speech recognition not available. Please use text mode below.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscriptRef.current += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            setTranscript(finalTranscriptRef.current + interimTranscript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setError(`Speech recognition error: ${event.error}. Try text mode below.`);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
            if (finalTranscriptRef.current.trim()) {
                processTranscript(finalTranscriptRef.current.trim());
            } else if (transcript.trim()) {
                processTranscript(transcript.trim());
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
        setError('');
        setTranscript('');
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsRecording(false);
    };

    const processTranscript = async (text: string) => {
        setIsLoading(true);
        
        try {
            const response = await fetch('/api/voice/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: text }),
            });

            const data = await response.json();
            setEmailDraft(data.emailDraft || data.transcript || text);

            if (onComplete) {
                onComplete(text, data.emailDraft || text);
            }
        } catch (err) {
            console.error('Error processing transcript:', err);
            setEmailDraft(text);
            if (onComplete) {
                onComplete(text, text);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleTextSubmit = () => {
        if (textInput.trim()) {
            processTranscript(textInput.trim());
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            {error && (
                <div className="p-4 bg-yellow-50 text-yellow-600 rounded-lg text-sm">
                    {error}
                </div>
            )}
            
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className={`p-6 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-100 animate-pulse' : 'bg-secondary'}`}>
                    {isRecording ? (
                        <Mic className="w-12 h-12 text-red-500" />
                    ) : (
                        <Mic className="w-12 h-12 text-primary" />
                    )}
                </div>

                <div className="flex gap-4">
                    {!isRecording ? (
                        <>
                            <Button onClick={startRecording} size="lg" className="w-40 bg-blue-600 hover:bg-blue-700 text-white">
                                Start Recording
                            </Button>
                            <Button onClick={() => setUseTextMode(true)} variant="outline" size="lg">
                                <Keyboard className="w-4 h-4 mr-2" />
                                Type Instead
                            </Button>
                            {onCancel && (
                                <Button onClick={onCancel} variant="outline" size="lg">
                                    Cancel
                                </Button>
                            )}
                        </>
                    ) : (
                        <Button onClick={stopRecording} variant="destructive" size="lg" className="w-40">
                            <Square className="w-4 h-4 mr-2" />
                            Stop
                        </Button>
                    )}
                </div>

                {isRecording && <p className="text-sm text-muted-foreground animate-pulse">Recording... Speak clearly</p>}
            </div>

            {/* Text Input Mode */}
            {useTextMode && (
                <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Type your message</h3>
                    <div className="flex gap-2">
                        <Input 
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Type what you want to say..."
                            className="flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                        />
                        <Button onClick={handleTextSubmit} disabled={isLoading || !textInput.trim()}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Email'}
                        </Button>
                    </div>
                </div>
            )}

            {(isLoading || transcript || emailDraft) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Raw Transcript Card */}
                    <div className="h-full rounded-xl border bg-card text-card-foreground shadow">
                        <div className="flex flex-col space-y-1.5 p-6">
                            <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Raw Transcript
                            </h3>
                            <p className="text-sm text-muted-foreground">What we heard...</p>
                        </div>
                        <div className="p-6 pt-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-40 space-y-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground">Refining with AI...</p>
                                </div>
                            ) : (
                                <div className="h-[300px] w-full rounded-md border p-4 overflow-y-auto">
                                    <p className="text-sm text-foreground whitespace-pre-wrap">{transcript}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Refined Email Card */}
                    <div className="h-full rounded-xl border bg-card text-card-foreground shadow border-primary/20">
                        <div className="flex flex-col space-y-1.5 p-6">
                            <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2 text-primary">
                                <Mail className="w-5 h-5" />
                                AI Refined Draft
                            </h3>
                            <p className="text-sm text-muted-foreground">Ready to send...</p>
                        </div>
                        <div className="p-6 pt-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-40 space-y-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Drafting email...</p>
                                </div>
                            ) : (
                                <textarea
                                    value={emailDraft}
                                    readOnly
                                    className="flex min-h-[300px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono bg-muted/30 resize-none"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
