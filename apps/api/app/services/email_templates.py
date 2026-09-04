"""HTML templates for Scout's transactional emails.

Kept separate from ``email.py`` (the Sendlib transport) so the transport stays
thin and each email template can grow without bloating the send path. The mockup
``docs/mockups/scout_email_welcome.html`` and
``docs/mockups/scout_email_reset_password.html`` are the visual source of truth;
``digest_email_html`` shares the same scaffolding so all emails look consistent.
"""

from app.config import settings


def _style_block() -> str:
    """Shared inline <style> block: email-safe resets + responsive rules."""
    return """
  body,table,td,a{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table,td{ mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img{ -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
  body{ margin:0; padding:0; width:100%!important; height:100%!important; background-color:#EBE8E1; }
  a{ color:#18A058; }
  @media screen and (max-width:600px){
    .email-container{ width:100%!important; }
    .fluid-padding{ padding-left:20px!important; padding-right:20px!important; }
    .stack{ display:block!important; width:100%!important; }
  }
""".strip()


def _head(title: str, preheader: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>{title}</title>
<!--[if mso]>
<noscript>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
</noscript>
<style>table,td,div,h1,p{{font-family:Georgia,"Times New Roman",serif;}}</style>
<![endif]-->
<style>
{_style_block()}
</style>
</head>
<body style="margin:0; padding:0; background-color:#EBE8E1;">

<!-- preheader (hidden preview text) -->
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
  {preheader}
</div>
<div style="display:none; max-height:0; overflow:hidden;">&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
"""


def _logo_row() -> str:
    return """
          <!-- logo header -->
          <tr>
            <td align="center" style="padding:40px 24px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:38px; height:38px; border-radius:50%; background-color:#18A058; text-align:center; vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr><td style="width:24px; height:24px; border-radius:50%; background-color:#1F2937; font-size:0; line-height:0;">&nbsp;</td></tr>
                    </table>
                  </td>
                  <td style="padding-left:10px; font-family:Georgia,'Times New Roman',serif; font-size:19px; font-weight:700; color:#1F2937;">Scout</td>
                </tr>
              </table>
            </td>
          </tr>
"""


def _cta_button(link: str, label: str) -> str:
    return f"""
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:999px; background-color:#18A058;">
                    <a href="{link}" target="_blank" style="display:inline-block; padding:13px 32px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:14px; font-weight:700; color:#FFFFFF; text-decoration:none; border-radius:999px;">
                      {label}
                    </a>
                  </td>
                </tr>
              </table>
"""


def _footer(
    sent_reason: str,
    copyright_line: str,
    *,
    link: tuple[str, str],
) -> str:
    """Footer with a single real ``(label, href)`` management link.

    Email clients and Sendlib flag ``href="#"`` as a broken link, so every link
    here is a real ``http`` URL. Point ``link`` at the closest in-app destination
    (e.g. the Account page for the email-preference toggle) and swap in dedicated
    legal/support routes once they exist.
    """
    label, href = link
    return f"""
  <!-- footer -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; margin:0 auto;">
    <tr>
      <td align="center" class="fluid-padding" style="padding:8px 24px 40px;">
        <p style="margin:0 0 8px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:11.5px; color:#9CA3AF; line-height:1.6;">
          {sent_reason}
        </p>
        <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:11.5px; color:#9CA3AF; line-height:1.6;">
          <a href="{href}" style="color:#9CA3AF; text-decoration:underline;">{label}</a>
        </p>
        <p style="margin:14px 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:11px; color:#C4C7CC;">
          {copyright_line}
        </p>
      </td>
    </tr>
  </table>
""".strip()


def welcome_email_html(full_name: str | None) -> str:
    greeting = full_name or "there"
    return _head(
        "Welcome to Scout",
        "You're in — here's how to get your first match. Save a startup, upload your CV, "
        "and Scout takes it from there.",
    ) + f"""
<center style="width:100%; background-color:#EBE8E1;">
<div style="max-width:600px; margin:0 auto;" class="email-container">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; margin:0 auto;">
    <tr>
      <td style="padding:32px 24px 20px;">

        <!-- outer white card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFFFFF; border-radius:16px; border:1px solid #E5E3DC; overflow:hidden;">
{_logo_row()}
          <!-- hero -->
          <tr>
            <td align="center" class="fluid-padding" style="padding:20px 48px 8px;">
              <h1 style="margin:0 0 12px; font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:26px; line-height:1.25; color:#1F2937;">
                Welcome to Scout, {greeting}.
              </h1>
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:14.5px; line-height:1.6; color:#6B7280;">
                Your workspace is ready. Save a startup, upload your CV, and Scout takes care of the research, the scoring, and the first draft — you take care of the sending.
              </p>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td align="center" style="padding:26px 24px 6px;">
{_cta_button(settings.web_app_url, "Open your workspace")}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:10px 24px 30px;">
              <a href="{settings.web_app_url}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:12.5px; font-weight:600; color:#6B7280; text-decoration:underline;">
                Or open your dashboard →
              </a>
            </td>
          </tr>

          <!-- divider -->
          <tr><td style="padding:0 32px;"><div style="border-top:1px solid #E5E3DC;"></div></td></tr>

          <!-- 3-step list -->
          <tr>
            <td class="fluid-padding" style="padding:28px 40px 8px;">
              <p style="margin:0 0 18px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#9CA3AF;">
                Three things, once each
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                <tr>
                  <td width="30" valign="top">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:22px; height:22px; border-radius:50%; background-color:#1F2937; text-align:center; font-family:'Courier New',monospace; font-size:11px; font-weight:700; color:#FFFFFF; line-height:22px;">1</td></tr></table>
                  </td>
                  <td style="padding-left:12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    <span style="font-size:13.5px; font-weight:700; color:#1F2937;">Install the extension</span><br>
                    <span style="font-size:12.5px; color:#6B7280; line-height:1.5;">One click to save a startup from any supported page.</span>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                <tr>
                  <td width="30" valign="top">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:22px; height:22px; border-radius:50%; background-color:#1F2937; text-align:center; font-family:'Courier New',monospace; font-size:11px; font-weight:700; color:#FFFFFF; line-height:22px;">2</td></tr></table>
                  </td>
                  <td style="padding-left:12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    <span style="font-size:13.5px; font-weight:700; color:#1F2937;">Upload your CV</span><br>
                    <span style="font-size:12.5px; color:#6B7280; line-height:1.5;">Encrypted at rest, never used to train external models.</span>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                <tr>
                  <td width="30" valign="top">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:22px; height:22px; border-radius:50%; background-color:#18A058; text-align:center; font-family:'Courier New',monospace; font-size:11px; font-weight:700; color:#FFFFFF; line-height:22px;">3</td></tr></table>
                  </td>
                  <td style="padding-left:12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    <span style="font-size:13.5px; font-weight:700; color:#1F2937;">See your first match</span><br>
                    <span style="font-size:12.5px; color:#6B7280; line-height:1.5;">A real fit score, with the gaps shown alongside it.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- trust strip -->
          <tr>
            <td style="padding:12px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E4F3EA; border-radius:10px;">
                <tr>
                  <td style="padding:13px 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:12px; color:#0F6E56; line-height:1.5;">
                    <strong>No auto-apply.</strong> Scout drafts your resume and outreach — you always click send.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

{_footer(
    "You're receiving this because you created a Scout account.",
    "© 2026 Scout, Inc.",
    link=("Manage email preferences", f"{settings.web_app_url}/settings/account"),
)}

</div>
</center>
</body>
</html>
""".strip()


def reset_password_html(email: str, reset_url: str) -> str:
    return _head(
        "Reset your Scout password",
        "Reset your password — this link expires in 60 minutes. If you didn't request this, you can ignore it.",
    ) + f"""
<center style="width:100%; background-color:#EBE8E1;">
<div style="max-width:600px; margin:0 auto;" class="email-container">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; margin:0 auto;">
    <tr>
      <td style="padding:32px 24px 20px;">

        <!-- outer white card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFFFFF; border-radius:16px; border:1px solid #E5E3DC; overflow:hidden;">
{_logo_row()}
          <!-- lock icon -->
          <tr>
            <td align="center" style="padding:16px 24px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:52px; height:52px; border-radius:14px; background-color:#FBF1DF; text-align:center; vertical-align:middle; font-family:Georgia,serif; font-size:22px; color:#B8791A;">
                    &#128274;
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- hero -->
          <tr>
            <td align="center" class="fluid-padding" style="padding:18px 48px 6px;">
              <h1 style="margin:0 0 12px; font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:24px; line-height:1.3; color:#1F2937;">
                Reset your password
              </h1>
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:14.5px; line-height:1.6; color:#6B7280;">
                We received a request to reset the password for <strong style="color:#1F2937;">{email}</strong>. Click below to choose a new one.
              </p>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td align="center" style="padding:26px 24px 10px;">
{_cta_button(reset_url, "Reset password")}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:2px 24px 6px;">
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:11.5px; color:#9CA3AF;">
                This link expires in 60 minutes.
              </p>
            </td>
          </tr>

          <!-- fallback link box -->
          <tr>
            <td class="fluid-padding" style="padding:22px 40px 4px;">
              <p style="margin:0 0 8px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:11.5px; color:#6B7280;">
                Or copy and paste this link:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAFAF8; border:1px solid #E5E3DC; border-radius:8px;">
                <tr>
                  <td style="padding:11px 14px; font-family:'Courier New',Courier,monospace; font-size:11.5px; color:#6B7280; word-break:break-all;">
                    {reset_url}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- divider -->
          <tr><td style="padding:24px 32px 0;"><div style="border-top:1px solid #E5E3DC;"></div></td></tr>

          <!-- security note -->
          <tr>
            <td class="fluid-padding" style="padding:20px 40px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAFAF8; border-radius:10px;">
                <tr>
                  <td style="padding:13px 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:12px; color:#6B7280; line-height:1.6;">
                    Didn't request this? You can safely ignore this email — your password won't change unless you click the link above and set a new one.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

{_footer(
    "Sent because a password reset was requested for your Scout account.",
    "© 2026 Scout, Inc.",
    link=("Secure your account", f"{settings.web_app_url}/settings/account"),
)}

</div>
</center>
</body>
</html>
""".strip()


def digest_email_html(items: list[tuple[str, str]]) -> str:
    """Daily reminder digest rendered from ``notifications`` rows.

    ``items`` is a list of ``(title, body)`` pairs; opt-in only via the worker.
    """
    if not items:
        body = (
            "<p style=\"margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',"
            "Helvetica,Arial,sans-serif; font-size:14.5px; line-height:1.6; color:#6B7280;\">"
            "You're all caught up — nothing needs your attention today.</p>"
        )
    else:
        bullets = "".join(
            f'<li style="margin:12px 0; padding-left:14px; border-left:2px solid #E4F3EA;">'
            f'<strong style="font-family:Georgia,serif; font-size:14px; color:#1F2937;">{title}</strong><br>'
            f'<span style="color:#6B7280; font-size:13px; line-height:1.5;">{body}</span></li>'
            for title, body in items
        )
        body = (
            "<p style=\"margin:0 0 6px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',"
            "Helvetica,Arial,sans-serif; font-size:14.5px; line-height:1.6; color:#6B7280;\">"
            "Here's what's happening in your Scout workspace:</p>"
            f'<ul style="list-style:none; padding:0; margin:0;">{bullets}</ul>'
        )
    return (
        _head("Your Scout digest", "Your daily Scout digest — here's what needs your attention.")
        + f"""
<center style="width:100%; background-color:#EBE8E1;">
<div style="max-width:600px; margin:0 auto;" class="email-container">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; margin:0 auto;">
    <tr>
      <td style="padding:32px 24px 20px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFFFFF; border-radius:16px; border:1px solid #E5E3DC; overflow:hidden;">
{_logo_row()}
          <!-- hero -->
          <tr>
            <td class="fluid-padding" style="padding:20px 48px 30px;">
              <h1 style="margin:0 0 12px; font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:24px; line-height:1.3; color:#1F2937;">
                Your Scout digest
              </h1>
              {body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

{_footer(
    "You're receiving this because you turned on email reminders in Scout.",
    "© 2026 Scout, Inc.",
    link=("Manage email preferences", f"{settings.web_app_url}/settings/account"),
)}

</div>
</center>
</body>
</html>
""".strip()
    )
