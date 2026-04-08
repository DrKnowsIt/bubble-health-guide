import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <div className="flex justify-center">
          <img
            src="/lovable-uploads/3e370215-2dd9-49b4-9004-374dd58c0bae.png"
            alt="DrKnowsIt Logo"
            className="h-16 w-16 rounded-xl"
          />
        </div>
        <div>
          <h1 className="text-6xl font-extrabold text-foreground mb-2">404</h1>
          <p className="text-xl text-muted-foreground">
            This page doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline" onClick={() => window.history.back()}>
            <span className="cursor-pointer">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
