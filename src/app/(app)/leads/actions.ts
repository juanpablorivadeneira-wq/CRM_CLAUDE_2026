"use server";

import { z } from "zod";
import type { Lead } from "@/types";

const leadFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, introduce un email válido." }),
  phone: z.string().min(7, { message: "Por favor, introduce un teléfono válido." }),
  status: z.enum(['Nuevo', 'Contactado', 'Seguimiento', 'Venta', 'Perdido']),
  salesperson: z.string().optional(),
  funnelAnswers: z.record(z.string()),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

export async function createLead(data: LeadFormValues, projectId: string): Promise<{ success: boolean; message: string; lead?: Lead }> {
    const validatedFields = leadFormSchema.safeParse(data);

    if (!validatedFields.success) {
        console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
        return { success: false, message: "Datos inválidos. Por favor, revisa el formulario." };
    }
    
    const leadData = validatedFields.data;

    const preferences = Object.entries(leadData.funnelAnswers || {})
        .map(([question, answer]) => `${question}:${answer || ''}`)
        .join('\n');
    
    const newLead: Lead = {
        id: `lead-${Date.now()}`,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        entryDate: new Date().toISOString(),
        status: leadData.status,
        salesperson: leadData.salesperson,
        preferences: preferences,
        avatarUrl: `https://picsum.photos/seed/${Date.now()}/100/100`,
        avatarHint: 'person placeholder',
        projectIds: [projectId],
        interactions: [],
        reminders: [],
    };

    console.log("New Lead to be created in DB:", newLead);
    
    // In a real app with a database, you would revalidate the path to refresh the data:
    // revalidatePath('/leads');

    return { success: true, message: `Lead "${leadData.name}" creado con éxito.`, lead: newLead };
}
