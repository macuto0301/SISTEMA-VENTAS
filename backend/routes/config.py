from flask import Blueprint, jsonify, request
from models import Configuracion
from database import db
import requests
from bs4 import BeautifulSoup
import re

config_bp = Blueprint('config', __name__)

@config_bp.route('/tasa-bcv', methods=['GET'])
def get_tasa_bcv_scraping():
    try:
        url = "https://www.bcv.org.ve"
        response = requests.get(url, verify=False, timeout=10)
        soup = BeautifulSoup(response.content, "html.parser")
        
        tag_dolar = soup.find(lambda tag: tag.name == "div" and "USD" in tag.text and "centros" in tag.get('class', []))
        if not tag_dolar:
            tag_dolar = soup.find(id="dolar")

        if tag_dolar:
            strong_tag = tag_dolar.find('strong')
            texto_valor = strong_tag.text.strip() if strong_tag else ""
            if not texto_valor:
                # Fallback simple
                texto_valor = tag_dolar.text.replace('USD', '').strip()
            
            # Limpiar posibles caracteres no numéricos excepto coma/punto
            valor_clean = re.search(r"\d+,\d+", texto_valor)
            if valor_clean:
                valor = float(valor_clean.group(0).replace(',', '.'))
                return jsonify({'promedio': valor, 'fuente': 'BCV Scraping'})
        
        return jsonify({'error': 'No se encontró el valor en el sitio del BCV'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@config_bp.route('/', methods=['GET'])
def get_config():
    configs = Configuracion.query.all()
    # Retornamos un objeto plano con las claves y valores
    return jsonify({c.clave: c.valor for c in configs})

@config_bp.route('/', methods=['POST'])
def save_config():
    data = request.get_json() # Espera un diccionario {clave: valor}
    try:
        for clave, valor in data.items():
            conf = Configuracion.query.filter_by(clave=clave).first()
            if conf:
                conf.valor = valor
            else:
                conf = Configuracion(clave=clave, valor=valor)
                db.session.add(conf)
        db.session.commit()
        return jsonify({'mensaje': 'Configuración guardada'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
