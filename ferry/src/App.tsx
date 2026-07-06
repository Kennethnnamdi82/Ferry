import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import UploadPage from "./pages/UploadPage";
import DocumentDetails from "./pages/DocumentDetails";
import VaultsList from "./pages/vaults/VaultsList";
import VaultDetails from "./pages/vaults/VaultDetails";
import Shared from "./pages/Shared";
import Trash from "./pages/Trash";
import Activity from "./pages/Activity";
import SharedFile from "./pages/SharedFile";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminVaults from "./pages/admin/AdminVaults";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminShares from "./pages/admin/AdminShares";
import AdminLogs from "./pages/admin/AdminLogs";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<Login adminLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/s/:token" element={<SharedFile />} />

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
            <Route path="/documents/:id" element={<ProtectedRoute><DocumentDetails /></ProtectedRoute>} />
            <Route path="/vaults" element={<ProtectedRoute><VaultsList /></ProtectedRoute>} />
            <Route path="/vaults/:id" element={<ProtectedRoute><VaultDetails /></ProtectedRoute>} />
            <Route path="/shared" element={<ProtectedRoute><Shared /></ProtectedRoute>} />
            <Route path="/trash" element={<ProtectedRoute><Trash /></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminOverview /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/vaults" element={<ProtectedRoute adminOnly><AdminVaults /></ProtectedRoute>} />
            <Route path="/admin/documents" element={<ProtectedRoute adminOnly><AdminDocuments /></ProtectedRoute>} />
            <Route path="/admin/shares" element={<ProtectedRoute adminOnly><AdminShares /></ProtectedRoute>} />
            <Route path="/admin/logs" element={<ProtectedRoute adminOnly><AdminLogs /></ProtectedRoute>} />

            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
