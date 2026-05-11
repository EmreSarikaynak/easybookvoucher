"use client";

import { useState, useEffect } from "react";
import { QuickSelectionModal } from "@/components/booking/quick-selection-modal";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

export function NewVoucherButton() {
    const [showModal, setShowModal] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdmin = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

                setIsAdmin(profile?.role === "super_admin" || profile?.role === "admin");
            }
            setLoading(false);
        };

        checkAdmin();
    }, []);

    // Admin değilse veya yükleniyorsa butonu gösterme
    if (loading || !isAdmin) return null;

    return (
        <>
            <Button
                onClick={() => setShowModal(true)}
                className="hidden sm:flex"
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni Bilet
            </Button>

            <QuickSelectionModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            />
        </>
    );
}
