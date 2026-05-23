import sys
import os
import json
import traceback
import joblib
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

# Resolve all asset paths relative to this script file,
# so the working directory of the Node.js process is irrelevant.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PERSONALITY_FEATURES = [
    'Openness', 'Conscientiousness', 'Extraversion',
    'Agreeableness', 'Neuroticism', 'Communication_Skills', 'Presentation_Skills',
]


def print_err(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


def main():
    if len(sys.argv) < 2:
        print_err("Usage: python recomendation_engine.py '<json_string>'")
        sys.exit(1)

    try:
        input_data = json.loads(sys.argv[1])
    except Exception as e:
        print_err("Failed to parse input JSON:", str(e))
        sys.exit(1)

    mode  = input_data.get('mode')
    limit = input_data.get('limit', 5)
    debug = os.environ.get('DEBUG_RECOMMENDATION', '0') == '1'

    # ── Load model assets ──────────────────────────────────────────────────────
    try:
        tfidf_path  = os.path.join(BASE_DIR, 'tfidf_vectorizer.pkl')
        scaler_path = os.path.join(BASE_DIR, 'personality_scaler.pkl')
        df_path     = os.path.join(BASE_DIR, 'final_dataset_processed.pkl')

        print_err(f"Loading TF-IDF model from {tfidf_path}")
        tfidf  = joblib.load(tfidf_path)
        print_err(f"Loading Scaler from {scaler_path}")
        scaler = joblib.load(scaler_path)
        print_err(f"Loading Dataset from {df_path}")
        df     = joblib.load(df_path)
    except Exception as e:
        print_err("Failed to load serialized assets:", str(e))
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

    # ── Student mode ───────────────────────────────────────────────────────────
    if mode == 'student':
        try:
            language_skills = input_data.get('language_skills', '')
            personality     = input_data.get('personality', {})
            opportunities   = input_data.get('opportunities', None)

            # Vectorise user technical profile
            user_tech_vector = tfidf.transform([str(language_skills)])

            # Scale user personality vector
            user_pers_vector = [float(personality.get(t, 3.0)) for t in PERSONALITY_FEATURES]
            user_pers_df     = pd.DataFrame([user_pers_vector], columns=PERSONALITY_FEATURES)
            user_pers_scaled = scaler.transform(user_pers_df)

            # ── Dynamic mode: score real MongoDB opportunities individually ────
            if opportunities is not None:
                if len(opportunities) == 0:
                    print(json.dumps({"success": True, "recommendations": []}))
                    sys.exit(0)

                # Batch-transform all opportunity tech strings in one call
                opp_required_languages = [str(opp.get('required_language', '')) for opp in opportunities]
                opp_tech_matrix        = tfidf.transform(opp_required_languages)
                tech_sims              = cosine_similarity(user_tech_vector, opp_tech_matrix).flatten()

                # Batch-transform all opportunity personality vectors
                opp_pers_vectors = [
                    [float(opp.get(t, 3.0)) for t in PERSONALITY_FEATURES]
                    for opp in opportunities
                ]
                opp_pers_df     = pd.DataFrame(opp_pers_vectors, columns=PERSONALITY_FEATURES)
                opp_pers_scaled = scaler.transform(opp_pers_df)
                pers_sims       = cosine_similarity(user_pers_scaled, opp_pers_scaled).flatten()

                recs_list = []
                for idx, opp in enumerate(opportunities):
                    tech_sim = float(tech_sims[idx])
                    pers_sim = float(pers_sims[idx])
                    hybrid   = (tech_sim * 0.6) + (pers_sim * 0.4)

                    opp_id    = str(opp.get('opportunityId', ''))
                    opp_title = str(opp.get('title', ''))
                    opp_track = str(opp.get('programming_track', ''))
                    opp_lang  = str(opp.get('required_language', ''))

                    if debug:
                        print_err(
                            f"[DEBUG] {opp_title[:40]!r} | "
                            f"required_language={opp_lang[:40]!r} | "
                            f"tech={tech_sim:.4f} pers={pers_sim:.4f} "
                            f"hybrid={hybrid:.4f} matchScore={round(hybrid * 100)}"
                        )

                    recs_list.append({
                        "opportunityId":       opp_id,
                        "title":               opp_title,
                        "programming_track":   opp_track,
                        "required_language":   opp_lang,
                        "hybrid_score":        hybrid,
                        "matchScore":          int(round(hybrid * 100)),
                        "techScore":           int(round(tech_sim * 100)),
                        "personalityScore":    int(round(pers_sim * 100)),
                        "matchReason":         f"Matched your technical skills and personality with {opp_title}.",
                        "recommendationSource":"python-hybrid-model",
                    })

                # Sort by hybrid_score descending, return top limit
                recs_list.sort(key=lambda x: x['hybrid_score'], reverse=True)
                recs_list = recs_list[:limit]

                print(json.dumps({"success": True, "recommendations": recs_list}))
                sys.exit(0)

            # ── Static dataset fallback (no opportunities key present) ─────────
            all_tech_matrix = tfidf.transform(df['tech_content'].fillna(''))
            tech_sim_scores = cosine_similarity(user_tech_vector, all_tech_matrix).flatten()

            pers_matrix_all = scaler.transform(df[PERSONALITY_FEATURES])
            pers_sim_scores = cosine_similarity(user_pers_scaled, pers_matrix_all).flatten()

            hybrid_scores = (tech_sim_scores * 0.6) + (pers_sim_scores * 0.4)

            df_copy = df.copy()
            df_copy['hybrid_score'] = hybrid_scores
            df_copy['tech_score']   = tech_sim_scores
            df_copy['pers_score']   = pers_sim_scores

            recommendations_df = df_copy.sort_values(by='hybrid_score', ascending=False)

            recs_list = []
            for _, row in recommendations_df.iterrows():
                org_name = str(row['organization_name'])
                if not org_name or org_name.lower() == 'nan':
                    continue

                track    = row['programming_track']
                req_lang = row['required_language']
                h_score  = float(row['hybrid_score'])
                t_score  = float(row['tech_score'])
                p_score  = float(row['pers_score'])

                recs_list.append({
                    "programming_track":  track,
                    "required_language":  req_lang,
                    "organization_name":  org_name,
                    "hybrid_score":       h_score,
                    "matchScore":         int(round(h_score * 100)),
                    "techScore":          int(round(t_score * 100)),
                    "personalityScore":   int(round(p_score * 100)),
                    "matchReason":        f"Matched your personality traits and technical skills in {track}.",
                })

                if len(recs_list) >= limit:
                    break

            print(json.dumps({"success": True, "recommendations": recs_list}))
            sys.exit(0)

        except Exception as e:
            print_err("Error during student recommendation inference:", str(e))
            traceback.print_exc(file=sys.stderr)
            sys.exit(1)

    # ── Organization mode ──────────────────────────────────────────────────────
    elif mode == 'organization':
        try:
            required_language = input_data.get('required_language', '')
            volunteers        = input_data.get('volunteers', [])

            if not volunteers:
                print(json.dumps({"success": True, "recommendations": []}))
                sys.exit(0)

            org_tech_vector = tfidf.transform([str(required_language)])
            vol_skills      = [str(v.get('language_skills', '')) for v in volunteers]
            vol_tech_matrix = tfidf.transform(vol_skills)
            tech_sim_scores = cosine_similarity(org_tech_vector, vol_tech_matrix).flatten()

            results = []
            for idx, vol in enumerate(volunteers):
                score      = float(tech_sim_scores[idx])
                match_score = int(round(score * 100))
                results.append({
                    "userId":     vol.get('userId'),
                    "matchScore": match_score,
                })

            results.sort(key=lambda x: x['matchScore'], reverse=True)
            results = results[:limit]

            print(json.dumps({"success": True, "recommendations": results}))
            sys.exit(0)

        except Exception as e:
            print_err("Error during organization recommendation inference:", str(e))
            traceback.print_exc(file=sys.stderr)
            sys.exit(1)

    else:
        print_err(f"Unknown mode: {mode}")
        sys.exit(1)


if __name__ == '__main__':
    main()