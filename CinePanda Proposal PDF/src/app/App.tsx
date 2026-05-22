import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import dolbyAtmosImg from "../imports/Screenshot_2026-04-16_at_10.57.54 AM.png";
import cinepandaLogo from "../imports/cinepanda-logo.png";

const IMG_KLIPSCH = "https://images.unsplash.com/photo-1643892330088-6df5351c3dc9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFjayUyMHRvd2VyJTIwc3BlYWtlciUyMGF1ZGlvJTIwaGlmaXxlbnwxfHx8fDE3NzYzMTYyNjN8MA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_RECEIVER = "https://images.unsplash.com/photo-1589647157397-6080774a0952?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBViUyMHJlY2VpdmVyJTIwaG9tZSUyMHRoZWF0ZXIlMjBibGFja3xlbnwxfHx8fDE3NzYzMTYyNTR8MA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_PROJECTOR = "https://images.unsplash.com/photo-1644586195587-4c376c041f08?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHw0SyUyMHByb2plY3RvciUyMEJlblElMjBob21lJTIwY2luZW1hfGVufDF8fHx8MTc3NjMxNjI1NXww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_SCREEN = "https://images.unsplash.com/photo-1699134811756-c95593c1c33f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9qZWN0aW9uJTIwc2NyZWVuJTIwaG9tZSUyMHRoZWF0ZXIlMjBmaXhlZCUyMGZyYW1lfGVufDF8fHx8MTc3NjMxNjI1NXww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_APPLE_TV = "https://images.unsplash.com/photo-1592042221673-7320147c7482?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBcHBsZSUyMFRWJTIwNEslMjBzdHJlYW1pbmclMjBkZXZpY2V8ZW58MXx8fHwxNzc2MzE2MjU1fDA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_INWALL = "https://images.unsplash.com/photo-1767059439630-ca3844d07d77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbiUyMHdhbGwlMjBzcGVha2VyJTIwd2hpdGUlMjBjZWlsaW5nfGVufDF8fHx8MTc3NjMxNjI1NXww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_DENON = "https://images.unsplash.com/photo-1532778597765-a2a1c4dda1ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxEZW5vbiUyMGFtcGxpZmllciUyMHN0ZXJlbyUyMGVxdWlwbWVudHxlbnwxfHx8fDE3NzYzMTYyNjN8MA&ixlib=rb-4.1.0&q=80&w=1080";

/* ---- Background watermark SVG (panda face + film reel, faded) ---- */
const watermarkSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" opacity="0.06">
  <!-- Film reel circle -->
  <circle cx="200" cy="280" r="160" fill="none" stroke="%23333" stroke-width="8"/>
  <circle cx="200" cy="280" r="140" fill="none" stroke="%23333" stroke-width="3"/>
  <circle cx="200" cy="280" r="30" fill="%23333"/>
  <!-- Film reel holes -->
  <circle cx="200" cy="170" r="25" fill="%23333"/>
  <circle cx="295" cy="225" r="25" fill="%23333"/>
  <circle cx="295" cy="335" r="25" fill="%23333"/>
  <circle cx="200" cy="390" r="25" fill="%23333"/>
  <circle cx="105" cy="335" r="25" fill="%23333"/>
  <circle cx="105" cy="225" r="25" fill="%23333"/>
  <!-- Panda head -->
  <ellipse cx="200" cy="100" rx="70" ry="60" fill="%23333"/>
  <!-- Panda ears -->
  <circle cx="145" cy="55" r="28" fill="%23333"/>
  <circle cx="255" cy="55" r="28" fill="%23333"/>
  <!-- Panda eyes patches -->
  <ellipse cx="175" cy="95" rx="22" ry="18" fill="%23555"/>
  <ellipse cx="225" cy="95" rx="22" ry="18" fill="%23555"/>
  <!-- Eyes white -->
  <circle cx="178" cy="93" r="8" fill="white"/>
  <circle cx="222" cy="93" r="8" fill="white"/>
  <!-- Nose -->
  <ellipse cx="200" cy="115" rx="10" ry="7" fill="%23555"/>
</svg>
`;
const watermarkDataUri = `url("data:image/svg+xml,${encodeURIComponent(watermarkSvg.replace(/\n/g, ''))}")`;

const pageStyle: React.CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  padding: "20mm 20mm 30mm 20mm",
  background: "#fff",
  position: "relative",
  boxSizing: "border-box",
  fontFamily: "Calibri, Arial, sans-serif",
  color: "#000",
  fontSize: "14px",
  lineHeight: "1.5",
  overflow: "hidden",
};

const watermarkStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "40px",
  right: "-40px",
  width: "450px",
  height: "550px",
  backgroundImage: watermarkDataUri,
  backgroundRepeat: "no-repeat",
  backgroundSize: "contain",
  pointerEvents: "none",
  zIndex: 0,
};

const contentStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
};

const tableHeaderStyle: React.CSSProperties = {
  background: "#dce6f1",
  fontWeight: "bold",
  padding: "8px 10px",
  border: "1px solid #000",
  textAlign: "center",
  fontSize: "14px",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #000",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "13px",
};

function Footer() {
  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: "0",
    }}>
      {/* Text line */}
      <div style={{
        padding: "4px 15px",
        fontSize: "11px",
        color: "#333",
        display: "flex",
        alignItems: "center",
        gap: "4px",
      }}>
        <span style={{ color: "#5b7ec2", fontSize: "13px" }}>📍</span>
        <span>
          Teepeyem Enclave, 2nd Floor, Opp. Gokul Oottupura, KK Road Kadavantra, Cochin - 682020 &nbsp;&nbsp; Mob : 9287777377 / 9745077377 &nbsp;&nbsp; sales@cinepanda.in &nbsp;&nbsp; <span style={{ fontWeight: "bold" }}>www.cinepanda.in</span>
        </span>
      </div>
      {/* Decorative stripe bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
        <div style={{ height: "4px", background: "linear-gradient(to right, #d4c48a, #c2a84e, #a08930)" }} />
        <div style={{ height: "2px", background: "#fff" }} />
        <div style={{ height: "6px", background: "linear-gradient(to right, #8a9cc4, #5b7ec2, #3a5a9e)" }} />
        <div style={{ height: "2px", background: "#fff" }} />
        <div style={{ height: "8px", background: "linear-gradient(to right, #6a7db8, #3f4f8a, #2a2d6e)" }} />
        <div style={{ height: "2px", background: "#fff" }} />
        <div style={{ height: "10px", background: "linear-gradient(to right, #4a3f7a, #35286a, #1e1350)" }} />
      </div>
    </div>
  );
}

function LogoHeader() {
  return (
    <div style={{ textAlign: "right", marginBottom: "10px" }}>
      <img
        src={cinepandaLogo}
        alt="CinePanda Entertainments"
        style={{ height: "80px", objectFit: "contain", display: "inline-block" }}
      />
    </div>
  );
}

function LogoSmall() {
  return (
    <div style={{ textAlign: "center" }}>
      <img
        src={cinepandaLogo}
        alt="CinePanda Entertainments"
        style={{ height: "55px", objectFit: "contain", display: "inline-block" }}
      />
    </div>
  );
}

/* ========== PAGE 1 ========== */
function Page1() {
  return (
    <div style={{ ...pageStyle, pageBreakAfter: "always" }}>
      <div style={watermarkStyle} />
      <div style={contentStyle}>
        <LogoHeader />

        <div style={{ display: "flex", justifyContent: "space-between", margin: "50px 0 30px" }}>
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>CP-Qtn: 01020-028</span>
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>24-02-2026</span>
        </div>

        <p style={{ margin: "40px 0 30px", fontSize: "14px", textIndent: "40px" }}>
          <span style={{ fontSize: "22px", fontWeight: "bold" }}>W</span>e take this opportunity to thanks you for your interests in our products and services,
          Based on the discussion with you, we hereby suggesting following video package for your home theatre room.
        </p>

        <h2 style={{ textAlign: "center", textDecoration: "underline", margin: "50px 0 40px", fontSize: "20px", fontWeight: "bold" }}>
          7.1.2 Dolby Atmos Speaker Configuration
        </h2>

        <div style={{ margin: "20px 0" }}>
          <ImageWithFallback
            src={dolbyAtmosImg}
            alt="7.1.2 Dolby Atmos Speaker Configuration"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* ========== PAGE 2 ========== */
function Page2() {
  return (
    <div style={{ ...pageStyle, pageBreakAfter: "always" }}>
      <div style={watermarkStyle} />
      <div style={contentStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>
            ➤ <span style={{ fontWeight: "bold" }}>AV Package 1, Klipsch with Benq 4K Projector.</span>
          </h2>
          <div style={{ marginLeft: "20px", flexShrink: 0 }}><LogoSmall /></div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "30px", fontSize: "12px" }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Sl.No</th>
              <th style={tableHeaderStyle}>ITEM</th>
              <th style={tableHeaderStyle}>SPECIFICATIONS</th>
              <th style={tableHeaderStyle}>QTY</th>
              <th style={tableHeaderStyle}>PRICE</th>
              <th style={tableHeaderStyle}>IMAGE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>1</td>
              <td style={{ ...tdStyle, fontWeight: "bold", maxWidth: "130px" }}>Klipsch 7.1.2 Dolby Atmos Inwall Speaker Package</td>
              <td style={{ ...tdStyle, textAlign: "center", maxWidth: "250px" }}>
                PRO-24RW-LCR SkyHook come to the LCR,Featuring dual 3.5" Injection Molded Graphite (IMG) Woofer and 1" Fixed Aluminum Dome ABS Tractrix® Horn-Loaded Tweeter, the PRO-24RW LCR brings incredible acoustics with the signature Klipsch sound. 2 Pair of inwall surround and R-121 SW Subwoofer 1 nos,Over Head Dolby atmos speakers 2nos.
              </td>
              <td style={tdStyle}>1 Set</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>4,20,000.00</td>
              <td style={{ ...tdStyle, width: "150px" }}>
                <ImageWithFallback src={IMG_KLIPSCH} alt="Klipsch" style={{ width: "130px", height: "100px", objectFit: "cover" }} />
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>2</td>
              <td style={{ ...tdStyle, fontWeight: "bold", maxWidth: "130px" }}>Integra Drx 5.4 8k Hdr Av Receiver 9.2 Dolby Atmos</td>
              <td style={{ ...tdStyle, textAlign: "center", maxWidth: "250px" }}>
                The Integra DRX 5.4 AV Receiver supports 8K HDR video for stunning visual clarity and lifelike images,Experience immersive, three-dimensional sound with support for Dolby Atmos and DTS:X audio formats,Enjoy studio-quality sound with support for high-resolution audio formats like FLAC, WAV, and DSD.
              </td>
              <td style={tdStyle}>1 Nos</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>2,69,800.00</td>
              <td style={{ ...tdStyle, width: "150px" }}>
                <ImageWithFallback src={IMG_RECEIVER} alt="Integra Receiver" style={{ width: "130px", height: "100px", objectFit: "cover" }} />
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>3</td>
              <td style={{ ...tdStyle, fontWeight: "bold", maxWidth: "130px" }}>BenQ TK710 4K Laser DLP Home Cinema & Gaming Projector</td>
              <td style={{ ...tdStyle, textAlign: "center", maxWidth: "250px" }}>
                Projector from BenQ. The TK710 features a long-lasting laser light source, with a brightness of 3200 ANSI lumens, and UHD 4K on-screen resolution for bright, lifelike images. Enhanced contrast with HDR support offers up to 95% coverage of the Rec.709 color space for clear details and rich colors in every scene. Designed with gaming in mind, the TK710 is capable of ultralow 4.2 ms input lag, with 1080p 240 Hz signals, and 16.7 ms with 4K at 60 Hz.
              </td>
              <td style={tdStyle}>1 Nos</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>2,49,000.00</td>
              <td style={{ ...tdStyle, width: "150px" }}>
                <ImageWithFallback src={IMG_PROJECTOR} alt="BenQ Projector" style={{ width: "130px", height: "100px", objectFit: "cover" }} />
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>4</td>
              <td style={{ ...tdStyle, fontWeight: "bold", maxWidth: "130px" }}>Elite 135" Fixed Frame 4K screen</td>
              <td style={{ ...tdStyle, textAlign: "center" }}>Fixed Frame screen 150" projection screen in 16:9 format</td>
              <td style={tdStyle}>1 Nos</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>62,000.00</td>
              <td style={{ ...tdStyle, width: "150px" }}>
                <ImageWithFallback src={IMG_SCREEN} alt="Screen" style={{ width: "130px", height: "80px", objectFit: "cover" }} />
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>5</td>
              <td style={{ ...tdStyle, fontWeight: "bold", maxWidth: "130px" }}>Apple TV 4K 32GB</td>
              <td style={{ ...tdStyle, textAlign: "center" }}>
                4K HDR and Dolby Vision for stunning picture quality, Dolby Atmos for immersive, room-filling sound,Watch original stories from the most creative minds in TV and film on Apple TV+.
              </td>
              <td style={tdStyle}>1 Nos</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>14,999.00</td>
              <td style={{ ...tdStyle, width: "150px" }}>
                <ImageWithFallback src={IMG_APPLE_TV} alt="Apple TV" style={{ width: "130px", height: "80px", objectFit: "cover" }} />
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>TOTAL</td>
              <td colSpan={2} style={{ ...tdStyle, fontWeight: "bold", textAlign: "right", fontSize: "16px" }}>10,15,799.00</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Footer />
    </div>
  );
}

/* ========== PAGE 3 ========== */
function Page3() {
  return (
    <div style={{ ...pageStyle, pageBreakAfter: "always" }}>
      <div style={watermarkStyle} />
      <div style={contentStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>
            ➤ <span style={{ fontWeight: "bold" }}>AV Package 2, Pure Acoustics with Benq 4K Projector.</span>
          </h2>
          <div style={{ marginLeft: "20px", flexShrink: 0 }}><LogoSmall /></div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "30px", fontSize: "12px" }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Sl.No</th>
              <th style={tableHeaderStyle}>ITEM</th>
              <th style={tableHeaderStyle}>SPECIFICATIONS</th>
              <th style={tableHeaderStyle}>QTY</th>
              <th style={tableHeaderStyle}>PRICE</th>
              <th style={tableHeaderStyle}>IMAGE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>1</td>
              <td style={{ ...tdStyle, fontWeight: "bold", maxWidth: "130px" }}>Pure Acoustics (US) 7.1.2 Dolby Atmos Inwall Speaker Package</td>
              <td style={{ ...tdStyle, textAlign: "center", maxWidth: "250px" }}>
                Pure Acoustics Rift 52 in-Wall Series Front LCR,rofessional 2-way speaker configuration,Ultra-thin magnetic grill offers a clean aesthetic finish,High performance 12dB crossover produces sharply defined highs and lows, and Rift 89 Series In-Wall Surround Speakers, 2 Nos of Dolby atmos speakers,1 No of Powred 12inch 300W Subwoofer.
              </td>
              <td style={tdStyle}>1 Set</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>1,65,700.00</td>
              <td style={{ ...tdStyle, width: "150px" }}>
                <ImageWithFallback src={IMG_INWALL} alt="Pure Acoustics" style={{ width: "130px", height: "100px", objectFit: "cover" }} />
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>2</td>
              <td style={{ ...tdStyle, fontWeight: "bold", maxWidth: "130px" }}>Denon AVR-X3800H 8k Hdr Av Receiver 9.2 Dolby Atmos</td>
              <td style={{ ...tdStyle, textAlign: "center", maxWidth: "250px" }}>
                Denon nine channels of amplification, up to four independent subwoofers, Dolby Atmos and DTS:X, plus IMAX Enhanced and Auro 3D, the AVR-X3800H envelops larger living spaces in theater-quality sound. Enjoy amazing 8K video quality and with HEOS®
              </td>
              <td style={tdStyle}>1 Nos</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>2,09,900.00</td>
              <td style={{ ...tdStyle, width: "150px" }}>
                <ImageWithFallback src={IMG_DENON} alt="Denon Receiver" style={{ width: "130px", height: "100px", objectFit: "cover" }} />
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>3</td>
              <td style={{ ...tdStyle, fontWeight: "bold", maxWidth: "130px" }}>BenQ TK700 4K UHD HDR Home Cinema Projector</td>
              <td style={{ ...tdStyle, textAlign: "center", maxWidth: "250px" }}>
                Display Feature: 4K resolution| create upto 200 inch screen | 3200 ANSI Lumens brightness | Lamp light source life upto 15000 hours,Connectivity: HDMI (2.0/HDCP 2.2) x 2, USB Type-A (2.0/Power Supply 1.5A) x 1, RS232 x 1, Audio: 5W chamber speakers, 3.5mm audio out, eARC HDMI Audio Return
              </td>
              <td style={tdStyle}>1 Nos</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>1,99,900.00</td>
              <td style={{ ...tdStyle, width: "150px" }}>
                <ImageWithFallback src={IMG_PROJECTOR} alt="BenQ TK700" style={{ width: "130px", height: "100px", objectFit: "cover" }} />
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>4</td>
              <td style={{ ...tdStyle, fontWeight: "bold", maxWidth: "130px" }}>Winger 120" Fixed Frame Perforated screen</td>
              <td style={{ ...tdStyle, textAlign: "center" }}>Fixed Frame screen 120" projection screen in 16:9 format</td>
              <td style={tdStyle}>1 Nos</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>40,000.00</td>
              <td style={{ ...tdStyle, width: "150px" }}>
                <ImageWithFallback src={IMG_SCREEN} alt="Screen" style={{ width: "130px", height: "80px", objectFit: "cover" }} />
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>5</td>
              <td style={{ ...tdStyle, fontWeight: "bold", maxWidth: "130px" }}>Apple TV 4K 32GB</td>
              <td style={{ ...tdStyle, textAlign: "center" }}>
                4K HDR and Dolby Vision for stunning picture quality, Dolby Atmos for immersive, room-filling sound,Watch original stories from the most creative minds in TV and film on Apple TV+.
              </td>
              <td style={tdStyle}>1 Nos</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>14,999.00</td>
              <td style={{ ...tdStyle, width: "150px" }}>
                <ImageWithFallback src={IMG_APPLE_TV} alt="Apple TV" style={{ width: "130px", height: "80px", objectFit: "cover" }} />
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>TOTAL</td>
              <td colSpan={2} style={{ ...tdStyle, fontWeight: "bold", textAlign: "right", fontSize: "16px" }}>6,30,499.00</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Footer />
    </div>
  );
}

/* ========== PAGE 4 ========== */
function Page4() {
  return (
    <div style={{ ...pageStyle, pageBreakAfter: "always" }}>
      <div style={watermarkStyle} />
      <div style={contentStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>
            ➤ <span style={{ textDecoration: "underline" }}>Room Acoustics, Ceiling & Carpet Work</span>
          </h2>
          <div style={{ marginLeft: "20px", flexShrink: 0 }}><LogoSmall /></div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "30px", fontSize: "12px" }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>SL No</th>
              <th style={tableHeaderStyle}>Description</th>
              <th style={tableHeaderStyle}>Acoustics Area in SqFt</th>
              <th style={tableHeaderStyle}>Acoustics Price / SqFt</th>
              <th style={tableHeaderStyle}>Total Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>1</td>
              <td style={{ ...tdStyle, textAlign: "center" }}>
                <span style={{ fontWeight: "bold", textDecoration: "underline" }}>Acoustical Pet Panel Side wall Finish</span>:- Supply and installation of 9mm polyster acousitcs panels direct on the wall as suggested room aesthetic.
              </td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>580 SqFt</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>285 / Sqft</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>1,65,300.00</td>
            </tr>
            <tr>
              <td style={tdStyle}>2</td>
              <td style={{ ...tdStyle, textAlign: "center", fontWeight: "bold" }}>Cove Light Ceiling Included with Paint finish</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>275 SqFt</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>125 / SqFt</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>34,375.00</td>
            </tr>
            <tr>
              <td style={tdStyle}>3</td>
              <td style={{ ...tdStyle, textAlign: "center", fontWeight: "bold" }}>Carpet flooring will be completed with poly foam</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>255 SqFt</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>180 / SqFt</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>45,900.00</td>
            </tr>
            <tr>
              <td style={tdStyle}>4</td>
              <td style={{ ...tdStyle, textAlign: "center" }}>
                <span style={{ fontWeight: "bold" }}>Plywood Work</span> :- Equipment Rack will be completed with plywood and finished with Mica / Carpet Material, Elevated platform complete with plywood and Speaker cabinet.
              </td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>118 SqFt</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>370 / SqFt</td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>43,660.00</td>
            </tr>
            <tr>
              <td colSpan={4} style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>Total</td>
              <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "right" }}>2,89,235.00</td>
            </tr>
          </tbody>
        </table>

        {/* Installation and Accessories */}
        <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: "50px 0 20px" }}>
          ➤ &nbsp; <span style={{ textDecoration: "underline" }}>Installation and Accessories</span>
        </h2>

        <table style={{ width: "80%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Sl.No</th>
              <th style={tableHeaderStyle}>Item</th>
              <th style={tableHeaderStyle}>Qty</th>
              <th style={tableHeaderStyle}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["1", "Liberty Projector Mount", "1 No", "4,500.00"],
              ["2", "4K ,3D Optical HDMI cable. 10mtr", "1 No", "15,999.00"],
              ["3", "Projector power supply Cable. 10mtr", "1 No", "1,500.00"],
              ["4", "Subwoofer Cable", "2 No", "3,600.00"],
              ["5", "Belkin Surge Protector", "2 Nos", "3,198.00"],
              ["6", "Speaker Cable 1.5mm OFC Speaker Cable", "1 reel", "12,999.00"],
              ["7", "Installation, Calibration & Training charges", "-", "45,000.00"],
            ].map(([no, item, qty, amt]) => (
              <tr key={no}>
                <td style={tdStyle}>{no}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{item}</td>
                <td style={tdStyle}>{qty}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{amt}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>TOTAL</td>
              <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "right" }}>86,796.00</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Footer />
    </div>
  );
}

/* ========== PAGE 5 ========== */
function Page5() {
  return (
    <div style={{ ...pageStyle }}>
      <div style={watermarkStyle} />
      <div style={contentStyle}>
        <LogoHeader />

        <hr style={{ border: "none", borderTop: "2px solid #1a3c6e", margin: "20px 0 30px" }} />

        <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#1a3c6e", margin: "20px 0 10px" }}>
          Total estimated project cost for AV Option 1 with Accessories and Installation is Rupees ₹ <span style={{ textDecoration: "line-through" }}>13,91,830.00/-</span>
        </h2>

        <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#d4183d", margin: "10px 0 30px" }}>
          Offer Price for the Package is 10,85,000.00/-
        </h2>

        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1a3c6e", margin: "20px 0 10px" }}>
          AV Option 2 with Accessories and Installation is Rupees ₹ <span style={{ textDecoration: "line-through" }}>10,06,530.00/-</span>
        </h2>

        <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#d4183d", margin: "10px 0 30px" }}>
          Offer Price for the Package is 7,74,000.00/-
        </h2>

        <hr style={{ border: "none", borderTop: "2px solid #1a3c6e", margin: "10px 0" }} />
        <hr style={{ border: "none", borderTop: "2px solid #1a3c6e", margin: "5px 0 40px" }} />

        <h3 style={{ fontWeight: "bold", textDecoration: "underline", margin: "30px 0 15px", fontSize: "16px" }}>Terms & Conditions</h3>
        <ol style={{ paddingLeft: "30px", margin: "0 0 30px", fontSize: "14px" }}>
          <li style={{ marginBottom: "5px" }}>All material are inclusive taxes.</li>
          <li style={{ marginBottom: "5px" }}>On order confirmation 50% of payment should be made in advance, 40% on delivery of materials And remaining 10% on competition.</li>
          <li style={{ marginBottom: "5px" }}>Transportation charges are extra.</li>
          <li style={{ marginBottom: "5px" }}>Image shown in the quote are for reference only, Original product may vary.</li>
          <li style={{ marginBottom: "5px" }}>Equipment warranties as set forth by the manufactures to their products.</li>
          <li style={{ marginBottom: "5px" }}>This quote is valid for 15 days only.</li>
        </ol>

        <p style={{ fontStyle: "italic", fontWeight: "bold", textAlign: "center", margin: "30px 0", fontSize: "14px" }}>
          Please feel free to call us for any further clarification and we look forward to your valued order and an opportunity to serve.
        </p>

        <div style={{ margin: "30px 0" }}>
          <p style={{ marginBottom: "5px" }}>With Warm Regards.</p>
          <p style={{ fontWeight: "bold", fontSize: "18px", margin: "5px 0 2px" }}>Jayasagar DS</p>
          <p style={{ margin: "2px 0", fontSize: "13px" }}>Sales & Marketing</p>
          <p style={{ margin: "2px 0", fontSize: "13px" }}>Mobile: 9287777377</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <div style={{ background: "#e0e0e0", minHeight: "100vh", padding: "20px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
      <Page1 />
      <Page2 />
      <Page3 />
      <Page4 />
      <Page5 />
    </div>
  );
}