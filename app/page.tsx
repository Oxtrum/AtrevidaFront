import Header from "@/components/Header/Header";
import Hero from "@/components/Hero/Hero";
import Servicios from "@/components/Servicios/Servicios";
import Nosotros from "@/components/Nosotros/Nosotros";
import Testimonios from "@/components/Testimonios/Testimonios";
import Contacto from "@/components/Contacto/Contacto";
import Footer from "@/components/Footer/Footer";
import CtaBanner from "@/components/CtaBanner/CtaBanner";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Servicios />
        <Nosotros />
        <Testimonios />
        <CtaBanner />
        <Contacto />
      </main>
      <Footer />
    </>
  );
}
