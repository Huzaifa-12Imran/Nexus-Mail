import React from 'react';
import VoiceRecorder from '@/components/VoiceRecorder';

export default function VoiceDemoPage() {
    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">Voice-to-Email AI Demo</h1>
                    <p className="text-xl text-muted-foreground">
                        Record your thoughts, and let AI craft the perfect professional email for you.
                    </p>
                </div>

                <VoiceRecorder />
            </div>
        </div>
    );
}
