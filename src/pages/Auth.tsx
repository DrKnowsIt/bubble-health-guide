import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { signInSchema, signUpSchema, validateForm } from '@/lib/validation';

export default function Auth() {
  const { user, session, loading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isSignUp, setIsSignUp] = useState(location.state?.mode === 'signup' || false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    accessCode: '',
  });
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const from = location.state?.from?.pathname || '/dashboard';

  // Debug logging for authentication state
  useEffect(() => {
    console.log('Auth component - Current state:', {
      user: user?.id || 'null',
      session: session?.access_token ? 'exists' : 'null',
      authLoading,
      currentPath: location.pathname,
      redirectTo: from
    });
  }, [user, session, authLoading, location.pathname, from]);

  useEffect(() => {
    if (!authLoading && user && session) {
      console.log('Auth - Redirecting authenticated user to:', from);
      try {
        navigate(from, { replace: true });
      } catch (error) {
        console.error('Auth - Navigation error:', error);
        // Fallback navigation
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, session, authLoading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validate form data
    const schema = isSignUp ? signUpSchema : signInSchema;
    const validation = validateForm(schema, isSignUp ? formData : { email: formData.email, password: formData.password });
    
    if (!validation.success && validation.errors) {
      setValidationErrors(validation.errors);
      return;
    }
    
    setLoading(true);

    try {
      const result = isSignUp 
        ? await signUp(formData.email, formData.password, formData.firstName, formData.lastName, formData.accessCode)
        : await signIn(formData.email, formData.password);
      
      if (result?.error) {
        // Don't log sensitive auth details
      }
    } catch (error) {
      // Error handled by auth hook
    } finally {
      setLoading(false);
    }
  };


  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      accessCode: '',
    });
    setShowAccessCode(false);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
    setValidationErrors({});
  };

  const renderFieldError = (field: string) => {
    if (!validationErrors[field]) return null;
    return (
      <div className="flex items-center gap-1 text-destructive text-xs mt-1">
        <AlertCircle size={12} />
        <span>{validationErrors[field]}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </div>
          <CardTitle className="text-2xl text-center">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp 
              ? 'Create your account to access DrKnowItAll'
              : 'Sign in to your account to continue'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={validationErrors.firstName ? 'border-destructive' : ''}
                  />
                  {renderFieldError('firstName')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={validationErrors.lastName ? 'border-destructive' : ''}
                  />
                  {renderFieldError('lastName')}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={validationErrors.email ? 'border-destructive' : ''}
              />
              {renderFieldError('email')}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={validationErrors.password ? 'border-destructive' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {renderFieldError('password')}
              {isSignUp && (
                <p className="text-xs text-muted-foreground">
                  Password must be 8+ characters with uppercase, lowercase, and number
                </p>
              )}
            </div>

            {isSignUp && (
              <div className="flex flex-col items-center space-y-2">
                {!showAccessCode ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAccessCode(true)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Have an access code?
                  </Button>
                ) : (
                  <div className="w-full space-y-2">
                    <Label htmlFor="accessCode" className="text-center block">Access Code (Optional)</Label>
                    <Input
                      id="accessCode"
                      placeholder="Enter your access code"
                      value={formData.accessCode}
                      onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                      className="text-center"
                    />
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAccessCode(false);
                          setFormData({ ...formData, accessCode: '' });
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>
          </form>


          <div className="text-center">
            <Button variant="link" onClick={toggleMode} className="text-sm">
              {isSignUp 
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"
              }
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}