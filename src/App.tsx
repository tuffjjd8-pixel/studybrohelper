import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import VerifyEmail from "./pages/VerifyEmail";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Premium from "./pages/Premium";
import PremiumSuccess from "./pages/PremiumSuccess";
import PremiumCancel from "./pages/PremiumCancel";
import SolveDetail from "./pages/SolveDetail";
import Chat from "./pages/Chat";
import Quiz from "./pages/Quiz";
import Calculator from "./pages/Calculator";
import Settings from "./pages/Settings";
import Polls from "./pages/Polls";
import BadgeCollection from "./pages/BadgeCollection";
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
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/premium/success" element={<PremiumSuccess />} />
            <Route path="/premium/cancel" element={<PremiumCancel />} />
            <Route path="/solve/:id" element={<SolveDetail />} />
            <Route path="/chat/:id" element={<Chat />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/polls" element={<Polls />} />
            <Route path="/badges" element={<BadgeCollection />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
