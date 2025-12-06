import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth";
import { api, Resume } from "@/lib/api";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function History() {
  const user = useAuthStore((state) => state.user);
  const [, navigate] = useLocation();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    loadResumes();
  }, [user]);

  const loadResumes = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await api.getUserResumes(user.id);
      setResumes(data.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load resume history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: "default",
      processing: "secondary",
      failed: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleView = (resumeId: string) => {
    navigate(`/editor?resumeId=${resumeId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Resume History
              </h1>
              <p className="text-lg text-gray-600">
                View and manage your optimized resumes
              </p>
            </div>
            <Button onClick={() => navigate("/")} variant="outline">
              Back to Home
            </Button>
          </div>
        </div>

        {/* Resume List */}
        <div className="max-w-6xl mx-auto space-y-4">
          {resumes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No resumes yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload your first resume to get started
                </p>
                <Button onClick={() => navigate("/")}>
                  Upload Resume
                </Button>
              </CardContent>
            </Card>
          ) : (
            resumes.map((resume) => (
              <Card key={resume.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">{getStatusIcon(resume.status)}</div>
                      <div>
                        <CardTitle className="text-xl mb-1">
                          {resume.fileName}
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-4">
                          <span>
                            Uploaded {format(new Date(resume.createdAt), "MMM d, yyyy")}
                          </span>
                          {resume.atsScore !== undefined && resume.atsScore !== null && (
                            <span className="text-indigo-600 font-semibold">
                              ATS Score: {resume.atsScore}/100
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div>{getStatusBadge(resume.status)}</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      {resume.keywordsScore !== undefined && resume.keywordsScore !== null && (
                        <div>
                          <span className="font-medium">Keywords:</span>{" "}
                          <span className="text-indigo-600">
                            {resume.keywordsScore}/100
                          </span>
                        </div>
                      )}
                      {resume.formattingScore !== undefined && resume.formattingScore !== null && (
                        <div>
                          <span className="font-medium">Formatting:</span>{" "}
                          <span className="text-indigo-600">
                            {resume.formattingScore}/100
                          </span>
                        </div>
                      )}
                      {resume.issues && resume.issues.length > 0 && (
                        <div>
                          <span className="font-medium">Issues:</span>{" "}
                          <span className="text-orange-600">
                            {resume.issues.length}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {resume.status === "completed" && (
                        <Button
                          onClick={() => handleView(resume.id)}
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      )}
                      {resume.status === "processing" && (
                        <Button
                          onClick={loadResumes}
                          size="sm"
                          variant="outline"
                        >
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Refresh
                        </Button>
                      )}
                      {resume.status === "failed" && (
                        <Button
                          onClick={() => navigate("/")}
                          size="sm"
                          variant="outline"
                        >
                          Try Again
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
