import sys
import os
import json
import traceback
import joblib
import re
import pandas as pd
import numpy as np
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


def sanitize_and_normalize_skills(skills_str):
    if not skills_str:
        return set()
    # Split by comma or semicolon
    raw_list = re.split(r'[,;]', str(skills_str))
    
    canonical_map = {
        'mongo': 'mongodb',
        'mongodb': 'mongodb',
        'node': 'nodejs',
        'node.js': 'nodejs',
        'nodejs': 'nodejs',
        'js': 'javascript',
        'reactjs': 'react',
        'sql db': 'sql'
    }
    
    normalized = set()
    for raw in raw_list:
        # lowercase & trim whitespace
        clean = raw.strip().lower()
        if not clean:
            continue
        # punctuation cleanup: keep alphanumeric, spaces, dot, #, +
        clean = re.sub(r'[^\w\.\#\+\s]', '', clean).strip()
        if not clean:
            continue
        # map to canonical forms
        mapped = canonical_map.get(clean, clean)
        normalized.add(mapped)
    return normalized


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

            # Canonical normalization of user skills
            user_skills_set = sanitize_and_normalize_skills(language_skills)
            user_skills_list = sorted(list(user_skills_set))
            user_skills_str = ', '.join(user_skills_list)

            # Vectorise user technical profile (using normalized string)
            user_tech_vector = tfidf.transform([user_skills_str])

            # Scale user personality vector
            user_pers_vector = [float(personality.get(t, 3.0)) for t in PERSONALITY_FEATURES]
            user_pers_df     = pd.DataFrame([user_pers_vector], columns=PERSONALITY_FEATURES)
            user_pers_scaled = scaler.transform(user_pers_df)

            # 1. Normalize onboarding traits to [0, 1] and compute weighted mean
            TRAIT_WEIGHTS = {
                "Leadership": 1.4,
                "Teamwork": 1.4,
                "Resilience": 1.3,
                "Conscientiousness": 1.3,
                "Empathy": 1.2,
                "Emotional_Reasoning": 1.2,
                "Networking": 1.1,
                "Communication_Skills": 0.7,
                "Presentation_Skills": 0.6
            }
            
            # Extract traits and default to 3.0 if missing
            student_traits = {t: float(personality.get(t, 3.0)) for t in TRAIT_WEIGHTS.keys()}
            student_traits_norm = {t: (val - 1.0) / 4.0 for t, val in student_traits.items()}
            
            weighted_sum = sum(TRAIT_WEIGHTS[t] * student_traits_norm[t] for t in TRAIT_WEIGHTS)
            total_weight = sum(TRAIT_WEIGHTS.values())
            weighted_behavioral_mean = weighted_sum / total_weight
            
            # 2. Compute variance (standard deviation of the normalized traits)
            normalized_vals = list(student_traits_norm.values())
            trait_variance = float(np.std(normalized_vals))
            
            # softened consistency factor
            consistency_factor = max(0.7, 1.0 - trait_variance * 0.5)
            
            # 3. Critical floor penalty:
            # If 5+ critical traits <= 1.0, apply floor_penalty = 0.75
            critical_traits = ["Teamwork", "Leadership", "Resilience", "Conscientiousness", "Empathy"]
            weak_critical_count = sum(1 for t in critical_traits if student_traits[t] <= 1.0)
            if weak_critical_count >= 5:
                floor_penalty = 0.75
            else:
                floor_penalty = 1.0
                
            # 4. Behavioral strength
            behavioral_strength = weighted_behavioral_mean * consistency_factor * floor_penalty
            behavioral_strength = max(0.0, min(1.0, behavioral_strength))

            # ── Dynamic mode: score real MongoDB opportunities individually ────
            if opportunities is not None:
                if len(opportunities) == 0:
                    print(json.dumps({"success": True, "recommendations": []}))
                    sys.exit(0)

                # Canonical normalization of required languages/skills for all opportunities
                opp_required_languages_normalized = []
                opp_required_languages_sets = []
                for opp in opportunities:
                    opp_lang_raw = str(opp.get('required_language', ''))
                    norm_set = sanitize_and_normalize_skills(opp_lang_raw)
                    opp_required_languages_sets.append(norm_set)
                    opp_required_languages_normalized.append(', '.join(sorted(list(norm_set))))

                # Batch-transform all opportunity tech strings in one call
                opp_tech_matrix        = tfidf.transform(opp_required_languages_normalized)
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
                    
                    # Check if opportunity has real personality vectors (any trait != 3.0)
                    opp_pers_vector = [float(opp.get(t, 3.0)) for t in PERSONALITY_FEATURES]
                    has_real_pers = any(val != 3.0 for val in opp_pers_vector)
                    has_pers_keys = any(t in opp for t in PERSONALITY_FEATURES)
                    
                    # Explicit skill coverage scoring
                    req_skills = opp_required_languages_sets[idx]
                    if len(req_skills) == 0:
                        coverage = 1.0
                    else:
                        matched = user_skills_set.intersection(req_skills)
                        coverage = len(matched) / len(req_skills)

                    # Coverage ceiling architecture
                    raw_tech_score = coverage * (0.7 + tech_sim * 0.3)
                    
                    # Hard full-coverage override (Fix #1)
                    if coverage >= 0.999:
                        raw_tech_score = 1.0

                    # Quadratic suppression MUST ALWAYS execute BEFORE final score generation
                    pers_sim_norm = (pers_sim + 1.0) / 2.0
                    if pers_sim < 0.0:
                        pers_sim_norm = ((pers_sim + 1.0) ** 2) / 2.0
                    pers_sim_norm = max(0.0, min(1.0, pers_sim_norm))

                    # Apply new reconstructed personality contribution: (behavioral_strength * 0.8) + (pers_sim_norm * 0.2)
                    final_pers_score = (behavioral_strength * 0.8) + (pers_sim_norm * 0.2)
                    final_pers_score = max(0.0, min(1.0, final_pers_score))

                    # Behavioral Gating
                    behavioral_gate = 0.6 + (final_pers_score * 0.4)
                    effective_tech = raw_tech_score * behavioral_gate

                    # Determine if fallback is used for UI labelling
                    used_fallback = not has_real_pers and has_pers_keys

                    # Final Hybrid Score (0.6 effective tech + 0.4 personality)
                    hybrid = (effective_tech * 0.6) + (final_pers_score * 0.4)

                    opp_id    = str(opp.get('opportunityId', ''))
                    opp_title = str(opp.get('title', ''))
                    opp_track = str(opp.get('programming_track', ''))
                    opp_lang  = str(opp.get('required_language', ''))

                    if debug:
                        debug_log = {
                            "coverage": round(coverage, 2),
                            "raw_tech_score": round(raw_tech_score, 2),
                            "effective_tech_score": round(effective_tech, 2),
                            "weighted_behavioral_mean": round(weighted_behavioral_mean, 2),
                            "consistency_factor": round(consistency_factor, 2),
                            "floor_penalty": round(floor_penalty, 2),
                            "behavioral_strength": round(behavioral_strength, 2),
                            "pers_alignment_norm": round(pers_sim_norm, 2),
                            "final_personality_score": round(final_pers_score, 2),
                            "behavioral_gate": round(behavioral_gate, 2),
                            "hybrid_score": round(hybrid, 2)
                        }
                        print_err(json.dumps(debug_log))

                    recs_list.append({
                        "opportunityId":       opp_id,
                        "title":               opp_title,
                        "programming_track":   opp_track,
                        "required_language":   opp_lang,
                        "hybrid_score":        hybrid,
                        "matchScore":          int(round(hybrid * 100)),
                        "techScore":           int(round(raw_tech_score * 100)),
                        "effectiveTechScore":  int(round(effective_tech * 100)),
                        "personalityScore":    int(round(final_pers_score * 100)),
                        "used_personality_fallback": used_fallback,
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

            # Compute explicit coverage for all rows in static dataset
            def compute_row_coverage(req_lang_val):
                req_skills = sanitize_and_normalize_skills(str(req_lang_val))
                if not req_skills:
                    return 1.0
                matched = user_skills_set.intersection(req_skills)
                return len(matched) / len(req_skills)

            coverages = df['required_language'].fillna('').apply(compute_row_coverage).values

            # Coverage ceiling architecture
            raw_tech_scores = coverages * (0.7 + tech_sim_scores * 0.3)
            # Hard override if coverage >= 0.999
            raw_tech_scores = np.where(coverages >= 0.999, 1.0, raw_tech_scores)

            pers_matrix_all = scaler.transform(df[PERSONALITY_FEATURES])
            pers_sim_scores = cosine_similarity(user_pers_scaled, pers_matrix_all).flatten()

            # Base normalization & negative suppression
            pers_sim_scores_norm = (pers_sim_scores + 1.0) / 2.0
            neg_mask = pers_sim_scores < 0.0
            pers_sim_scores_norm[neg_mask] = ((pers_sim_scores[neg_mask] + 1.0) ** 2) / 2.0

            # Clamping safeguard
            pers_sim_scores_norm = np.clip(pers_sim_scores_norm, 0.0, 1.0)

            # Apply new reconstructed personality contribution: (behavioral_strength * 0.8) + (pers_sim_scores_norm * 0.2)
            final_pers_scores = (behavioral_strength * 0.8) + (pers_sim_scores_norm * 0.2)
            final_pers_scores = np.clip(final_pers_scores, 0.0, 1.0)

            # Behavioral Gating
            behavioral_gates = 0.6 + (final_pers_scores * 0.4)
            effective_tech_scores = raw_tech_scores * behavioral_gates

            # Final Hybrid Score (0.6 effective tech + 0.4 personality)
            has_real_pers_mask = (df[PERSONALITY_FEATURES] != 3.0).any(axis=1).values
            hybrid_scores = (effective_tech_scores * 0.6) + (final_pers_scores * 0.4)

            df_copy = df.copy()
            df_copy['hybrid_score'] = hybrid_scores
            df_copy['raw_tech_score'] = raw_tech_scores
            df_copy['tech_score']   = effective_tech_scores
            df_copy['pers_score']   = final_pers_scores

            recommendations_df = df_copy.sort_values(by='hybrid_score', ascending=False)

            recs_list = []
            for orig_idx, row in recommendations_df.iterrows():
                org_name = str(row['organization_name'])
                if not org_name or org_name.lower() == 'nan':
                    continue

                track    = row['programming_track']
                req_lang = row['required_language']
                h_score  = float(row['hybrid_score'])
                raw_t_score = float(row['raw_tech_score'])
                t_score  = float(row['tech_score'])
                p_score  = float(row['pers_score'])
                used_fallback = not has_real_pers_mask[orig_idx]

                if debug:
                    gate_val = 0.6 + p_score * 0.4
                    debug_log = {
                        "coverage": round(float(coverages[orig_idx]), 2),
                        "raw_tech_score": round(raw_t_score, 2),
                        "effective_tech_score": round(t_score, 2),
                        "weighted_behavioral_mean": round(weighted_behavioral_mean, 2),
                        "consistency_factor": round(consistency_factor, 2),
                        "floor_penalty": round(floor_penalty, 2),
                        "behavioral_strength": round(behavioral_strength, 2),
                        "pers_alignment_norm": round(float(pers_sim_scores_norm[orig_idx]), 2),
                        "final_personality_score": round(p_score, 2),
                        "behavioral_gate": round(gate_val, 2),
                        "hybrid_score": round(h_score, 2)
                    }
                    print_err(json.dumps(debug_log))

                recs_list.append({
                    "programming_track":  track,
                    "required_language":  req_lang,
                    "organization_name":  org_name,
                    "hybrid_score":       h_score,
                    "matchScore":         int(round(h_score * 100)),
                    "techScore":          int(round(raw_t_score * 100)),
                    "effectiveTechScore":  int(round(t_score * 100)),
                    "personalityScore":   int(round(p_score * 100)),
                    "used_personality_fallback": used_fallback,
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