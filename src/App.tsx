import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Premium from "./pages/Premium";
import SolveDetail from "./pages/SolveDetail";
import Chat from "./pages/Chat";
import Quiz from "./pages/Quiz";
import Settings from "./pages/Settings";
import GoogleOAuthKeys from "./pages/GoogleOAuthKeys";
import Polls from "./pages/Polls";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/solve/:id" element={<SolveDetail />} />
            <Route path="/chat/:id" element={<Chat />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/google-oauth" element={<GoogleOAuthKeys />} />
            <Route path="/polls" element={<Polls />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
