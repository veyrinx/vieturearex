import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2, "Họ tên tối thiểu 2 ký tự.").max(80),
  email: z.string().email("Email không hợp lệ."),
  message: z.string().min(10, "Tin nhắn tối thiểu 10 ký tự.").max(2000),
});

export type ContactInput = z.infer<typeof contactSchema>;
