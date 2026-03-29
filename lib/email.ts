import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function enviarEmailRecuperacao(
  email: string,
  nome: string,
  resetUrl: string
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Redefinição de senha — Credfácil',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#111;margin-bottom:8px">Redefinir sua senha</h2>
          <p style="color:#555">Olá, ${nome}.</p>
          <p style="color:#555">Recebemos uma solicitação para redefinir a senha da sua conta Credfácil. Clique no botão abaixo para criar uma nova senha:</p>
          <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#16a34a;color:#fff;border-radius:12px;text-decoration:none;font-weight:600">
            Redefinir senha
          </a>
          <p style="color:#999;font-size:13px">Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este email.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('[email] Erro ao enviar email de recuperação:', err);
    return false;
  }
}
