import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.app.core.config import settings

class EmailService:
    def __init__(self):
        self.smtp_server = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = getattr(settings, "SMTP_PORT", 587)
        self.smtp_user = getattr(settings, "SMTP_USER", "notificaciones@donde-david.com")
        self.smtp_password = getattr(settings, "SMTP_PASSWORD", "")

    def send_order_confirmation(self, email: str, pedido_id: int, total: float):
        subject = f"✅ Pedido #{pedido_id} Confirmado - DONDE DAVID"
        body = f"""
        ¡Hola!
        
        Tu pedido #{pedido_id} ha sido registrado exitosamente en Donde David.
        Total Neto: ${total:.2f}
        
        Tu comanda ya se encuentra en preparación.
        
        ¡Gracias por elegir DONDE DAVID!
        """
        self.send_email_safe(email, subject, body)

    def send_email_safe(self, to_email: str, subject: str, body: str):
        try:
            if not self.smtp_password:
                print(f"📧 [SIMULACIÓN EMAIL] Para: {to_email} | Asunto: {subject}")
                return True

            msg = MIMEMultipart()
            msg['From'] = self.smtp_user
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"Aviso en envío de email: {e}")
            return False

email_service = EmailService()
