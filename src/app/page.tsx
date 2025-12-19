// src\app\page.tsx
"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Camera, MapPin, Send, Home, CheckCircle, AlertCircle, ShieldCheck, User, Phone, Map as MapIcon } from 'lucide-react';

const MapWithNoSSR = dynamic(() => import('@/component/map'), { 
  ssr: false,
  loading: () => <div className="p-10 text-center">Carregando mapa...</div>
});

// Definição da interface
interface FormDataState {
  name: string;
  phone: string;
  location: { latitude: number; longitude: number; accuracy?: number } | null;
  locationError: string | null;
  description: string;
  photo: File | null;
  photoPreview: string | null;
  date: string | null;
  lgpdAccepted: boolean;
}

export default function OlhoVivoROO() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [denunciasMap, setDenunciasMap] = useState([]);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  
  const [formData, setFormData] = useState<FormDataState>({
    name: '',
    phone: '',
    location: null,
    locationError: null,
    description: '',
    photo: null,
    photoPreview: null,
    date: null,
    lgpdAccepted: false
  });

  const handleOpenMap = async () => {
    setIsLoadingMap(true);
    try {
      const res = await fetch('/api/denuncias');
      const data = await res.json();
      setDenunciasMap(data);
      setCurrentPage('map');
    } catch (error) {
      alert('Erro ao carregar o mapa. Tente novamente.');
      console.error(error);
    } finally {
      setIsLoadingMap(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setFormData(prev => ({
        ...prev,
        locationError: 'Geolocalização não suportada pelo navegador'
      }));
      return;
    }

    setIsRequestingLocation(true);
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // Força nova leitura sempre
    };

    setFormData(prev => ({
      ...prev,
      locationError: null,
      location: null
    }));

    console.log('Solicitando localização...');

    let bestAccuracy = Infinity;
    let watchId: number;
    let timeoutId: NodeJS.Timeout;
    let acceptanceTimeoutId: NodeJS.Timeout;

    // Timeout de segurança máximo
    timeoutId = setTimeout(() => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (bestAccuracy === Infinity) {
        setFormData(prev => ({
          ...prev,
          locationError: 'Não foi possível obter uma localização precisa. Tente novamente em área aberta.'
        }));
        setIsRequestingLocation(false);
      }
    }, 15000);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        
        console.log(`Nova leitura - Precisão: ${accuracy.toFixed(2)}m`);

        // Se a precisão for melhor que a anterior, atualiza
        if (accuracy < bestAccuracy) {
          bestAccuracy = accuracy;
          
          setFormData(prev => ({
            ...prev,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: accuracy
            },
            locationError: null
          }));

          if (accuracy < 15) {
            navigator.geolocation.clearWatch(watchId);
            clearTimeout(timeoutId);
            if (acceptanceTimeoutId) clearTimeout(acceptanceTimeoutId);
            setIsRequestingLocation(false);
            console.log('Localização de alta precisão obtida!');
          }
        }

        if (!acceptanceTimeoutId) {
          acceptanceTimeoutId = setTimeout(() => {
            if (bestAccuracy < Infinity && bestAccuracy < 100) {
              navigator.geolocation.clearWatch(watchId);
              clearTimeout(timeoutId);
              setIsRequestingLocation(false);
              console.log(`Localização aceita com precisão de ${bestAccuracy.toFixed(2)}m`);
            }
          }, 12000);
        }
      },
      (error) => {
        console.error('Erro de geolocalização:', error);
        if (watchId) navigator.geolocation.clearWatch(watchId);
        clearTimeout(timeoutId);
        if (acceptanceTimeoutId) clearTimeout(acceptanceTimeoutId);
        
        let errorMessage = 'Erro ao obter localização';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permissão de localização negada. Por favor, habilite nas configurações do navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Localização indisponível. Verifique se o GPS está ativado e tente em área aberta.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tempo esgotado. Verifique sua conexão e tente novamente.';
            break;
          default:
            errorMessage = `Erro: ${error.message}`;
        }
        
        setFormData(prev => ({
          ...prev,
          location: null,
          locationError: errorMessage
        }));
        setIsRequestingLocation(false);
      },
      options
    );
  };

  const handlePhotoChange = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        photo: file,
        photoPreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleSubmit = async () => {
    // Verificações de segurança
    if (!formData.name || !formData.phone || !formData.location || !formData.description || !formData.photo || !formData.lgpdAccepted) {
      alert('Por favor, preencha todos os campos e aceite os termos de uso.');
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToSend = new FormData();
      dataToSend.append('name', formData.name);
      dataToSend.append('phone', formData.phone);
      dataToSend.append('description', formData.description);
      dataToSend.append('latitude', String(formData.location.latitude));
      dataToSend.append('longitude', String(formData.location.longitude));
      if (formData.location.accuracy) {
        dataToSend.append('accuracy', String(formData.location.accuracy));
      }
      dataToSend.append('photo', formData.photo);

      const response = await fetch('/api/denuncias', {
        method: 'POST',
        body: dataToSend,
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar denúncia');
      }

      const result = await response.json();
      console.log('Sucesso:', result);
      
      const currentDate = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      setFormData(prev => ({
        ...prev,
        date: currentDate
      }));

      setCurrentPage('success');

    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao enviar a denúncia. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      location: null,
      locationError: null,
      description: '',
      photo: null,
      photoPreview: null,
      date: null,
      lgpdAccepted: false
    });
    setCurrentPage('home');
  };

  const goToForm = () => {
    setCurrentPage('form');
  };

  if (currentPage === 'map') {
    return (
      <MapWithNoSSR 
        denuncias={denunciasMap} 
        onBack={() => setCurrentPage('home')} 
      />
    );
  }

  if (currentPage === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ backgroundColor: '#1d3557' }}>
                <MapPin className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-2" style={{ color: '#1D1D1F', letterSpacing: '-0.3px' }}>
                Olho Vivo ROO
              </h1>
              <p className="text-xl" style={{ color: '#86868B', letterSpacing: '-0.2px' }}>
                Bem-vindo de volta!
              </p>
            </div>

            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <p className="text-gray-700 text-lg leading-relaxed">
                Plataforma de denúncia simplificada de terrenos baldios
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={goToForm}
                className="w-full text-white font-semibold py-4 px-8 rounded-3xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-3 text-lg"
                style={{ backgroundColor: '#1d3557', letterSpacing: '-0.2px' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#14293d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1d3557'}
              >
                <Send className="w-6 h-6" />
                Nova Denúncia
              </button>
              
              <button
                onClick={handleOpenMap}
                disabled={isLoadingMap}
                className="w-full bg-white border-2 border-blue-900 text-blue-900 font-semibold py-4 px-8 rounded-3xl shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 text-lg hover:bg-blue-50"
              >
                {isLoadingMap ? (
                  'Carregando...'
                ) : (
                  <>
                    <MapIcon className="w-6 h-6" />
                    Visualizar Mapa de Denúncias
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-blue-900 mb-6" style={{ color: '#1D1D1F', letterSpacing: '-0.3px' }}>
              Nova Denúncia
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      placeholder="Seu nome"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-3">
                  Localização
                </label>
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={isRequestingLocation}
                  className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <MapPin className="w-5 h-5" />
                  {isRequestingLocation ? 'Buscando localização precisa...' : 'Solicitar Localização'}
                </button>

                {formData.location && (
                  <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm flex-1">
                        <p className="font-semibold text-green-800">Localização capturada!</p>
                        <p className="text-green-700">
                          Lat: {formData.location.latitude.toFixed(10)}, 
                          Lng: {formData.location.longitude.toFixed(10)}
                        </p>
                        {formData.location.accuracy && (
                          <div className="mt-2">
                            <p className="text-green-600 font-medium">
                              Precisão: ~{Math.round(formData.location.accuracy)}m
                              {formData.location.accuracy < 20 && ' ✓ Excelente'}
                              {formData.location.accuracy >= 20 && formData.location.accuracy < 50 && ' ✓ Boa'}
                              {formData.location.accuracy >= 50 && formData.location.accuracy < 100 && ' ⚠ Razoável'}
                              {formData.location.accuracy >= 100 && ' ⚠ Baixa'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {formData.location.accuracy && formData.location.accuracy >= 50 && (
                      <button
                        type="button"
                        onClick={requestLocation}
                        disabled={isRequestingLocation}
                        className="mt-3 w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                      >
                        {isRequestingLocation ? 'Buscando...' : 'Tentar obter precisão melhor'}
                      </button>
                    )}
                  </div>
                )}

                {formData.locationError && (
                  <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{formData.locationError}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-3">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-500"
                  rows={5}
                  placeholder="Descreva o problema encontrado no terreno baldio..."
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-3">
                  Foto
                </label>
                <label className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  style={{ backgroundColor: '#1d3557', letterSpacing: '-0.2px' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#14293d'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1d3557'}>
                  <Camera className="w-5 h-5" />
                  {formData.photo ? 'Trocar Foto' : 'Tirar/Selecionar Foto'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>

                {formData.photoPreview && (
                  <div className="mt-4">
                    <img
                      src={formData.photoPreview}
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                    />
                  </div>
                )}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center h-6">
                    <input
                      id="lgpd-consent"
                      type="checkbox"
                      checked={formData.lgpdAccepted}
                      onChange={(e) => setFormData(prev => ({ ...prev, lgpdAccepted: e.target.checked }))}
                      className="w-5 h-5 text-blue-900 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="lgpd-consent" className="text-sm text-gray-700 cursor-pointer select-none">
                      <span className="font-semibold flex items-center gap-1 mb-1">
                        <ShieldCheck className="w-4 h-4 text-blue-900" />
                        Termo de Conformidade LGPD
                      </span>
                      Declaro que estou ciente de que meus dados de contato, a foto e a localização fornecidas serão utilizados exclusivamente para fins de fiscalização e registro da ocorrência.
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!formData.location || !formData.description || !formData.photo || !formData.lgpdAccepted || isSubmitting}                  
                  style={{ backgroundColor: '#1d3557', letterSpacing: '-0.2px' }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#14293d')}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#1d3557')}
                >
                  {isSubmitting ? (
                    <>Enviando...</>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Enviar Denúncia
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6 flex items-center justify-center">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-600 rounded-full mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-green-900 mb-4">
              Denúncia enviada com sucesso!
            </h2>

            <p className="text-xl text-gray-600 mb-8">
              Agradecemos por sua colaboração
            </p>

            <button
              onClick={resetForm}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-3 mx-auto text-lg"
            >
              <Home className="w-6 h-6" />
              Voltar para o Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}