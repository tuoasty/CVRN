'use client';

import { useState } from 'react';
import {testSheetConnection} from "@/app/actions/connection.action";
import {toast} from "@/app/utils/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import {Button} from "@/app/components/ui/button";

export default function AdminSyncPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleTestConnection = async () => {
        setLoading(true);
        setResult(null);

        try {
            const response = await testSheetConnection();

            if (response.success) {
                toast.success('Connected to Google Sheets', `Found ${response.rowCount} rows`);
                setResult(response);
            } else {
                toast.error('Connection failed', response.error);
                setResult(response);
            }
        } catch (error) {
            toast.error('Connection failed', error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Google Sheets Sync</h1>
                <p className="text-muted-foreground">Test and manage playoff bracket synchronization</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Connection Test</CardTitle>
                    <CardDescription>
                        Test the connection to Google Sheets API
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={handleTestConnection}
                        disabled={loading}
                    >
                        {loading ? 'Connecting...' : 'Fetch Sheet Data'}
                    </Button>

                    {result && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                            <h3 className="font-semibold mb-2">Result:</h3>
                            {result.success ? (
                                <div className="space-y-2">
                                    <p className="text-sm"><span className="font-medium">Sheet ID:</span> {result.sheetId}</p>
                                    <p className="text-sm"><span className="font-medium">Sheet Name:</span> {result.sheetName}</p>
                                    <p className="text-sm"><span className="font-medium">Rows Found:</span> {result.rowCount}</p>

                                    <details className="mt-4">
                                        <summary className="cursor-pointer text-sm font-medium">View Raw Data</summary>
                                        <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                                    </details>
                                </div>
                            ) : (
                                <p className="text-sm text-destructive">{result.error}</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}