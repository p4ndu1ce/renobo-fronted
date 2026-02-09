import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withViewTransitions, withHashLocation } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './interceptors/auth.interceptor';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import {
  Mail,
  Lock,
  FingerprintPattern,
  User,
  Phone,
  FileText,
  House,
  Wrench,
  ClipboardList,
  Bell,
  Menu,
  Zap,
  Droplet,
  Hammer,
  PaintBucket,
  Settings,
  Wind,
  CreditCard,
  ArrowLeft,
  TrendingUp,
  Star,
  Check,
  Calculator,
  DollarSign,
  Upload,
  Send,
  CircleCheck,
  MapPin,
  Clock,
  MessageCircle,
  CheckCircle2,
  ChevronRight,
  Calendar,
  Camera,
  Image,
  Paperclip,
} from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        Mail,
        Lock,
        FingerprintPattern,
        User,
        Phone,
        FileText,
        House,
        Wrench,
        ClipboardList,
        Bell,
        Menu,
        Zap,
        Droplet,
        Hammer,
        PaintBucket,
        Settings,
        Wind,
        CreditCard,
        ArrowLeft,
        TrendingUp,
        Star,
        Check,
        Calculator,
        DollarSign,
        Upload,
        Send,
        CircleCheck,
        MapPin,
        Clock,
        MessageCircle,
        CheckCircle2,
        ChevronRight,
        Calendar,
        Camera,
        Image,
        Paperclip,
      }),
    },
    // withHashLocation: en APK/Capacitor no hay servidor real; rutas tipo /home recargan el WebView.
// Con # las rutas son index.html#/home y no provocan refresh.
provideRouter(routes, withViewTransitions(), withHashLocation()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    )
  ]
};
