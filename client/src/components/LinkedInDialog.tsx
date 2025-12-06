import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkedinIcon, Copy, Loader2, CheckCircle } from "lucide-react";
import { api, type LinkedInProfile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface LinkedInDialogProps {
  resumeId: string;
}

export function LinkedInDialog({ resumeId }: LinkedInDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const generateProfile = async () => {
    try {
      setLoading(true);
      const result = await api.generateLinkedIn(resumeId);
      setProfile(result);
      toast({
        title: "LinkedIn Profile Generated",
        description: "Your optimized LinkedIn profile is ready!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate LinkedIn profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({
        title: "Copied!",
        description: `${fieldName} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <LinkedinIcon className="h-4 w-4" />
          Optimize for LinkedIn
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkedinIcon className="h-5 w-5 text-blue-600" />
            LinkedIn Profile Optimization
          </DialogTitle>
          <DialogDescription>
            Generate an optimized LinkedIn headline and about section based on your resume
          </DialogDescription>
        </DialogHeader>

        {!profile ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LinkedinIcon className="h-16 w-16 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Generate Your LinkedIn Profile</h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              We&apos;ll analyze your resume and create a compelling LinkedIn headline and about
              section that showcases your expertise.
            </p>
            <Button onClick={generateProfile} disabled={loading} size="lg" className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Profile...
                </>
              ) : (
                <>
                  <LinkedinIcon className="h-4 w-4" />
                  Generate LinkedIn Profile
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Headline */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">LinkedIn Headline</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(profile.headline, "Headline")}
                  >
                    {copiedField === "Headline" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <CardDescription>120 characters max - appears under your name</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-900">{profile.headline}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {profile.headline.length} / 120 characters
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">About Section</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(profile.about, "About Section")}
                  >
                    {copiedField === "About Section" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <CardDescription>Your professional story - 2000 characters max</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={profile.about} readOnly className="min-h-[200px] resize-none" />
                <p className="text-xs text-gray-500 mt-2">
                  {profile.about.length} / 2000 characters
                </p>
              </CardContent>
            </Card>

            {/* Suggestions */}
            {profile.suggestions && profile.suggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Recommendations</CardTitle>
                  <CardDescription>Tips to further optimize your LinkedIn profile</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profile.suggestions.map((suggestion, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-semibold text-sm text-gray-900 mb-1">
                          {suggestion.section}
                        </h4>
                        <p className="text-sm text-gray-600">{suggestion.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setProfile(null)} className="flex-1">
                Generate New Profile
              </Button>
              <Button onClick={() => setOpen(false)} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
