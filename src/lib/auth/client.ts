import { createBrowserClient } from '@supabase/ssr';

export interface LoginRequest {
    identifier: string; // email or phone
    password: string;
    rememberMe: boolean;
}

export interface LoginResponse {
    success: boolean;
    requires2FA?: boolean;
    sessionId?: string;
    error?: AuthError;
    user?: {
        id: string;
        email?: string;
        phone?: string;
    };
}

export interface AuthError {
    code: string;
    message: string;
    lockoutRemaining?: number; // in seconds
}

export interface OTPVerifyRequest {
    sessionId: string;
    code: string;
}

export interface OTPVerifyResponse {
    success: boolean;
    token?: string;
    error?: AuthError;
    attemptsRemaining?: number;
}

/**
 * Login with email or phone + password
 * Integrates with Supabase Auth
 */
export async function loginAction(data: LoginRequest): Promise<LoginResponse> {
    try {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Determine if identifier is email or phone
        const isEmail = data.identifier.includes('@');

        // Supabase sign in
        const { data: authData, error } = await supabase.auth.signInWithPassword({
            email: isEmail ? data.identifier : undefined,
            phone: !isEmail ? data.identifier : undefined,
            password: data.password,
        } as any);

        if (error) {
            return {
                success: false,
                error: {
                    code: error.status?.toString() || 'AUTH_ERROR',
                    message: getErrorMessage(error.message),
                },
            };
        }

        if (!authData.session || !authData.user) {
            return {
                success: false,
                error: {
                    code: 'NO_SESSION',
                    message: 'Giriş yapılamadı. Lütfen tekrar deneyin.',
                },
            };
        }

        // TODO: Check if user has 2FA enabled in your database
        // For now, we'll assume 2FA is not enabled
        const requires2FA = false;

        return {
            success: true,
            requires2FA,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                phone: authData.user.phone,
            },
        };
    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            error: {
                code: 'NETWORK_ERROR',
                message: 'Bağlantı sorunu oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.',
            },
        };
    }
}

/**
 * Convert Supabase error messages to user-friendly Turkish messages
 */
function getErrorMessage(error: string): string {
    if (error.includes('Invalid login credentials')) {
        return 'E-posta/telefon veya şifreniz hatalı. Lütfen kontrol edip tekrar deneyin.';
    }

    if (error.includes('Email not confirmed')) {
        return 'E-posta adresiniz henüz doğrulanmamış. Lütfen e-postanızı kontrol edin.';
    }

    if (error.includes('User not found')) {
        return 'Kullanıcı bulunamadı. Lütfen bilgilerinizi kontrol edin.';
    }

    if (error.includes('Too many requests')) {
        return 'Çok fazla başarısız giriş denemesi yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.';
    }

    return 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
}

/**
 * Verify OTP code (2FA)
 * This is a placeholder - implement based on your 2FA system
 */
export async function verifyOTPAction(data: OTPVerifyRequest): Promise<OTPVerifyResponse> {
    // TODO: Implement OTP verification with your backend
    return {
        success: false,
        error: {
            code: 'NOT_IMPLEMENTED',
            message: '2FA henüz aktif değil',
        },
    };
}

/**
 * Resend OTP code
 */
export async function resendOTPAction(sessionId: string): Promise<{ success: boolean; error?: AuthError }> {
    // TODO: Implement OTP resend
    return {
        success: false,
        error: {
            code: 'NOT_IMPLEMENTED',
            message: '2FA henüz aktif değil',
        },
    };
}
