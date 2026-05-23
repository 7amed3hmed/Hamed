import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity

# 1. تحميل البيانات
df = pd.read_csv('fi.csv')

# --- الجزء الخاص بالـ Content (المهارات التقنية) ---
df['tech_content'] = df['programming_track'].astype(str) + " " + df['required_language'].astype(str)
tfidf = TfidfVectorizer(stop_words='english')
tfidf.fit(df['tech_content'])

# --- الجزء الخاص بالـ Collaborative (الشخصية) ---
personality_features = ['Openness', 'Conscientiousness', 'Extraversion', 
                        'Agreeableness', 'Neuroticism', 'Communication_Skills', 'Presentation_Skills']
scaler = MinMaxScaler()
scaler.fit(df[personality_features])

# 2. حفظ الأدوات كملفات pkl
joblib.dump(tfidf, 'tfidf_vectorizer.pkl')
joblib.dump(scaler, 'personality_scaler.pkl')
joblib.dump(df, 'final_dataset_processed.pkl')

print("✅ تم تدريب الموديل وحفظ الملفات بنجاح!")
print("الملفات الناتجة: tfidf_vectorizer.pkl, personality_scaler.pkl, final_dataset_processed.pkl")