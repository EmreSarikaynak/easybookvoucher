import { getBoatById } from "@/app/actions/boat";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import BoatEditForm from "./boat-edit-form";

export default async function EditBoatPage({
    params,
}: {
    params: { id: string };
}) {
    const { data: boat, error } = await getBoatById(params.id);

    if (error || !boat) {
        notFound();
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-6">
                <Link
                    href="/fleet"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Geri Dön
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Tekneyi Düzenle</h1>
                <p className="text-gray-600 mt-1">{boat.name}</p>
            </div>

            <BoatEditForm boat={boat} />
        </div>
    );
}
