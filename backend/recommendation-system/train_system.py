import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity

# 1. Load data
df = pd.read_csv('fi.csv')

df['tech_content'] = df['required_language'].fillna('').astype(str)
tfidf = TfidfVectorizer(
    stop_words='english',
    lowercase=True,
    ngram_range=(1, 2),
    token_pattern=r'(?u)\b[\w\.\#\+]+\b'
)
tfidf.fit(df['tech_content'])

# --- Collaborative filtering part (personality) ---
personality_features = ['Openness', 'Conscientiousness', 'Extraversion', 
                        'Agreeableness', 'Neuroticism', 'Communication_Skills', 'Presentation_Skills']
scaler = MinMaxScaler()
scaler.fit(df[personality_features])

# 2. Save artifacts as pkl files
joblib.dump(tfidf, 'tfidf_vectorizer.pkl')
joblib.dump(scaler, 'personality_scaler.pkl')
joblib.dump(df, 'final_dataset_processed.pkl')

print("Model trained and files saved successfully!")
print("Output files: tfidf_vectorizer.pkl, personality_scaler.pkl, final_dataset_processed.pkl")